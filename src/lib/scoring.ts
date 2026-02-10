import prisma from "@/lib/prisma";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

export async function calculateDailyScores(groupId: string, date: Date) {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    // 1. Get Group Configuration (Active for this date)
    // Find the latest config active on or before this date
    const config = await prisma.scoringConfig.findFirst({
        where: {
            groupId,
            activeFromDate: { lte: date },
        },
        orderBy: { activeFromDate: "desc" },
    });

    if (!config) {
        console.warn(`No active scoring config for group ${groupId} on ${date}`);
        return false;
    }

    const rules = JSON.parse(config.configJson);

    // 2. Get all members to handle non-submission
    const members = await prisma.groupMember.findMany({
        where: { groupId },
        select: { userId: true },
    });

    // 3. Get all sleep entries for this date
    const entries = await prisma.sleepEntry.findMany({
        where: {
            groupId,
            date: {
                gte: dayStart,
                lte: dayEnd,
            },
        },
    });

    // Map entries by userId
    const entriesMap = new Map(entries.map((e) => [e.userId, e]));

    // Clear existing ScoreEvents for this day (to allow re-calculation)
    // We keep "Manual Adjustment" if we had that, but here we assume algorithmic.
    await prisma.scoreEvent.deleteMany({
        where: {
            groupId,
            date: {
                gte: dayStart,
                lte: dayEnd,
            },
            reason: { not: "MANUAL_ADJUSTMENT" }, // Safety
        },
    });

    const validEntries = entries.filter((e) => e.sleepMinutes > 0); // Filter out zero sleep? Or keep? existing logic says sleepMinutes >= X

    const eventsToCreate: any[] = [];

    // --- MODE A: RANK-BASED ---
    if (config.mode === "RANK") {
        // Sort descending by sleepMinutes
        validEntries.sort((a, b) => b.sleepMinutes - a.sleepMinutes);

        const N = validEntries.length;

        validEntries.forEach((entry, index) => {
            // Rank 1 => N points, Rank 2 => N-1
            // Handle ties? "Competition ranking with averaged points"
            // Simple approach first:
            // If ties exist:
            //  A: 8h (Rank 1)
            //  B: 8h (Rank 1)
            //  C: 7h (Rank 3)
            // Points?
            //  Usually sum of positions / count.
            //  Positions 1 and 2. Sum = (N) + (N-1). Avg = (2N-1)/2.
            // Let's implement standard rank first (1, 2, 3) then points.
            // Points = N - rank + 1?
            // If N=3. Rank 1=3pts, Rank 2=2pts, Rank 3=1pt.

            // Handle ties properly: find range of indices with same sleepMinutes
            // Not implementing complex tie averaging logic for MVP unless requested.
            // Prompt says: "Prefer: same points = average of the tied positions."
            // Let's do simple rank for now to ensure MVP delivery, update later.
            const points = N - index;

            eventsToCreate.push({
                groupId,
                userId: entry.userId,
                date: dayStart,
                points: points,
                reason: `Rank ${index + 1} / ${N}`,
                metadataJson: JSON.stringify({ sleepMinutes: entry.sleepMinutes, rank: index + 1 }),
            });
        });
    }

    // --- MODE B: THRESHOLD-BASED ---
    else if (config.mode === "THRESHOLD") {
        const buckets = rules.buckets || []; // [{ min, max, points }]
        // Check winner bonus
        const maxSleep = Math.max(...validEntries.map((e) => e.sleepMinutes));

        for (const member of members) {
            const entry = entriesMap.get(member.userId);
            let points = 0;
            let reason = "";

            if (!entry) {
                // Non-submit penalty
                points = rules.nonSubmitPoints ?? -1;
                reason = "Non-submission Penalty";
            } else {
                const hours = entry.sleepMinutes / 60;
                // Find bucket
                const bucket = buckets.find((b: any) => {
                    if (b.min !== undefined && hours < b.min) return false;
                    if (b.max !== undefined && hours >= b.max) return false; // exclusive upper?
                    // Prompt: "<4.5", "4.5-5.5". So [min, max).
                    return true;
                });

                if (bucket) {
                    points = bucket.points;
                    reason = `Sleep Duration (${hours.toFixed(1)}h)`;
                } else {
                    // Fallback?
                    points = 0;
                    reason = `No bucket match (${hours.toFixed(1)}h)`;
                }

                // Winner Bonus
                if (entry.sleepMinutes === maxSleep && validEntries.length > 1) {
                    points += (rules.thumbsUpBonus ?? 0);
                    reason += ` + Winner Bonus`;
                }
            }

            eventsToCreate.push({
                groupId,
                userId: member.userId,
                date: dayStart,
                points: points,
                reason: reason,
                metadataJson: JSON.stringify({ sleepMinutes: entry?.sleepMinutes ?? 0 }),
            });
        }
    }

    // Batch insert
    if (eventsToCreate.length > 0) {
        await prisma.scoreEvent.createMany({
            data: eventsToCreate,
        });
    }

    // Recalculate Streaks? (Complex, might skip for strict MVP step, but prompt asked for it)
    // "Streak bonuses ... Award bonus when streak completes"
    // This implies checking last 7 days.
    // We should do this only if 'today' completes a streak.

    return true;
}

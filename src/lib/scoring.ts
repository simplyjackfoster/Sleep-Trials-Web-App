import prisma from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";

// ... (imports)

export async function calculateDailyScores(groupId: string, date: Date) {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    // 1. Get Group Configuration
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

    // 2. Get all members
    const members = await prisma.groupMember.findMany({
        where: { groupId },
        select: { userId: true },
    });

    // 3. Get all sleep entries
    const entries = await prisma.sleepEntry.findMany({
        where: {
            groupId,
            date: {
                gte: dayStart,
                lte: dayEnd,
            },
        },
    });

    const entriesMap = new Map(entries.map((e) => [e.userId, e]));

    // Clear existing ScoreEvents
    await prisma.scoreEvent.deleteMany({
        where: {
            groupId,
            date: {
                gte: dayStart,
                lte: dayEnd,
            },
            reason: { not: "MANUAL_ADJUSTMENT" },
        },
    });

    const validEntries = entries.filter((e) => e.sleepMinutes > 0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const eventsToCreate: any[] = []; // keeping any for simplicity with prisma createMany, but specifying structure below

    // --- MODE A: RANK-BASED ---
    if (config.mode === "RANK") {
        validEntries.sort((a, b) => b.sleepMinutes - a.sleepMinutes);
        const N = validEntries.length;

        validEntries.forEach((entry, index) => {
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

        // Handle non-submitters in Rank mode? usually 0 pts.
    }

    // --- MODE B: THRESHOLD-BASED ---
    else if (config.mode === "THRESHOLD") {
        const buckets = rules.buckets || [];
        const maxSleep = validEntries.length > 0 ? Math.max(...validEntries.map((e) => e.sleepMinutes)) : 0;

        for (const member of members) {
            const entry = entriesMap.get(member.userId);
            let points = 0;
            let reason = "";
            let minutes = 0;

            if (!entry) {
                points = rules.nonSubmitPoints ?? -1;
                reason = "Non-submission Penalty";
            } else {
                minutes = entry.sleepMinutes;
                const hours = minutes / 60;

                // Find bucket
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const bucket = buckets.find((b: any) => {
                    if (b.min !== undefined && hours < b.min) return false;
                    if (b.max !== undefined && hours >= b.max) return false;
                    return true;
                });

                if (bucket) {
                    points = bucket.points;
                    reason = `Sleep Duration (${hours.toFixed(1)}h)`;
                } else {
                    points = 0;
                    reason = `No bucket match (${hours.toFixed(1)}h)`;
                }

                // Winner Bonus
                if (minutes === maxSleep && validEntries.length > 1) {
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
                metadataJson: JSON.stringify({ sleepMinutes: minutes }),
            });
        }
    }

    if (eventsToCreate.length > 0) {
        await prisma.scoreEvent.createMany({
            data: eventsToCreate,
        });
    }

    return true;
}

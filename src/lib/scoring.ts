import prisma from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";

// ... (imports)

export async function calculateDailyScores(groupId: string, date: Date) {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    // 1. Define Rules / Buckets
    // < 6h  = -1
    // 6-6.5h  = 0
    // 6.5–7.0h   = +1
    // 7.0–7.5h  = +2
    // +7.5h   = +3
    const buckets = [
        { max: 6, points: -1 },
        { min: 6, max: 6.5, points: 0 },
        { min: 6.5, max: 7, points: 1 },
        { min: 7, max: 7.5, points: 2 },
        { min: 7.5, points: 3 }
    ];
    const nonSubmitPoints = -1;
    const dailyWinnerBonus = 1;
    const streakThresholdMinutes = 420; // 7h

    // 2. Get all members
    const members = await prisma.groupMember.findMany({
        where: { groupId },
        select: { userId: true },
    });

    // 3. Get sleep entries for Today
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
    const validEntries = entries.filter((e) => e.sleepMinutes > 0);
    const maxSleep = validEntries.length > 0 ? Math.max(...validEntries.map((e) => e.sleepMinutes)) : 0;

    // 4. Fetch history for Streak Calculation (Last 8 days including today)
    // We need 8 days to distinguish between exactly 7 and > 7
    const streakStart = new Date(dayStart);
    streakStart.setDate(streakStart.getDate() - 7); // T-7 days (total 8 days range: T-7 to T)

    const historyEntries = await prisma.sleepEntry.findMany({
        where: {
            groupId,
            date: {
                gte: streakStart,
                lte: dayEnd,
            },
        },
    });

    // Helper to check streak
    const getStreakBonus = (userId: string, currentMinutes: number) => {
        if (currentMinutes < streakThresholdMinutes) return 0;

        // Get past 7 days (T-1 to T-7)
        // We only care if T (today) is good (checked above) AND previous days are good
        let streakCount = 1; // Today is good

        // Check T-1 down to T-7
        for (let i = 1; i <= 7; i++) {
            const d = new Date(dayStart);
            d.setDate(d.getDate() - i);
            const entry = historyEntries.find(
                (e) => e.userId === userId &&
                    e.date.getTime() === d.getTime() &&
                    e.sleepMinutes >= streakThresholdMinutes
            );
            if (entry) {
                streakCount++;
            } else {
                break;
            }
        }

        if (streakCount === 7) return 3; // Exactly 7 days
        if (streakCount > 7) return 1;   // > 7 days (8+)

        return 0;
    };


    // 5. Clear existing ScoreEvents for this day
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

    // Void Day Logic: If nobody submitted, don't penalize anyone.
    if (entries.length === 0) {
        return true;
    }

    /* 
       Safety check: If NO ONE submitted usually skip? 
       But requirement says "Didn't submit = -1". 
       So we should process everyone if we want to enforce penalties.
       However, if the group is inactive, we might spam -1s. 
       For now, we'll proceed if there is at least one member?
       Let's stick to: if 0 entries, log and skip (to avoid cron spam on empty groups),
       UNLESS it's triggered manually. 
       But user request implies simple rules. Let's assume active group.
       If validEntries.length === 0, we can skip for now or penalize based on context.
       Let's penalize if at least 1 person exists? No, standard practice is skip if empty day to save DB space?
       Actually, "Didn't submit = -1" implies we record it. 
       Let's calculate for all members.
    */

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const eventsToCreate: any[] = [];

    for (const member of members) {
        const entry = entriesMap.get(member.userId);
        let points = 0;
        let reasons: string[] = [];
        let minutes = 0;

        if (!entry) {
            points = nonSubmitPoints;
            reasons.push("Didn't submit");
        } else {
            minutes = entry.sleepMinutes;
            const hours = minutes / 60;

            // Duration Points
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const bucket = buckets.find((b: any) => {
                if (b.min !== undefined && hours < b.min) return false;
                if (b.max !== undefined && hours >= b.max) return false;
                return true;
            });

            if (bucket) {
                points += bucket.points;
                reasons.push(`Sleep (${hours.toFixed(1)}h)`);
            } else {
                reasons.push(`Sleep (${hours.toFixed(1)}h) [No Bucket]`);
            }

            // Streak Bonus
            const sBonus = getStreakBonus(member.userId, minutes);
            if (sBonus > 0) {
                points += sBonus;
                reasons.push(sBonus === 3 ? "7-day Streak!" : "Streak Continued");
            }

            // Daily Winner Benefit
            // "Daily winner = +1"
            // Ties allowed? Yes.
            if (minutes === maxSleep && validEntries.length > 1) {
                points += dailyWinnerBonus;
                reasons.push("Daily Winner");
            }
        }

        eventsToCreate.push({
            groupId,
            userId: member.userId,
            date: dayStart,
            points: points,
            reason: reasons.join(", "),
            metadataJson: JSON.stringify({ sleepMinutes: minutes }),
        });
    }

    if (eventsToCreate.length > 0) {
        await prisma.scoreEvent.createMany({
            data: eventsToCreate,
        });
    }

    return true;
}

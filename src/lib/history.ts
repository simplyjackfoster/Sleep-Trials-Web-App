import prisma from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";

export type DailyScorecardEntry = {
    userId: string;
    userName: string | null;
    userImage: string | null;
    sleepMinutes: number; // 0 if no entry
    points: number;
    reason: string | null;
    rank: number; // For that specific day
    isWinner: boolean;
};

export async function getDailyScorecard(groupId: string, date: Date): Promise<DailyScorecardEntry[]> {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    // 1. Get Members
    const members = await prisma.groupMember.findMany({
        where: { groupId },
        include: { user: true },
    });

    // 2. Get Sleep Entries for this day
    const entries = await prisma.sleepEntry.findMany({
        where: {
            groupId,
            date: {
                gte: dayStart,
                lte: dayEnd,
            },
        },
    });

    // 3. Get Score Events for this day
    const events = await prisma.scoreEvent.findMany({
        where: {
            groupId,
            date: {
                gte: dayStart,
                lte: dayEnd,
            },
        },
    });

    // 4. Map and Combine
    const scorecard: DailyScorecardEntry[] = members.map((member) => {
        const entry = entries.find((e) => e.userId === member.userId);
        const event = events.find((e) => e.userId === member.userId); // Assuming 1 main event per day or summing?

        // If multiple events (e.g. sleep points + bonus), sum them
        const userEvents = events.filter(e => e.userId === member.userId);
        const totalPoints = userEvents.reduce((acc, curr) => acc + curr.points, 0);

        // Find main reason (prioritize bonus or rank)
        const mainReason = userEvents.map(e => e.reason).join(", ");

        return {
            userId: member.userId,
            userName: member.user.name,
            userImage: member.user.image,
            sleepMinutes: entry ? entry.sleepMinutes : 0,
            points: totalPoints,
            reason: mainReason || "No data",
            rank: 0, // Fill later
            isWinner: false, // Fill later
        };
    });

    // 5. Sort by Sleep Duration (for daily winner calculation) NOT points necessarily, 
    // although points usually follow sleep. Let's sort by Points first, then Sleep.
    scorecard.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return b.sleepMinutes - a.sleepMinutes;
    });

    // 6. Assign Ranks and Winner
    // Winner is whoever has max sleepMinutes (if > 0)
    // The previous sorting might not be perfect for "Winner" flag if based purely on sleep minutes?
    // Let's find max sleep minutes separately.
    const maxSleep = Math.max(...scorecard.map(s => s.sleepMinutes));

    scorecard.forEach((entry, index) => {
        entry.rank = index + 1;
        if (entry.sleepMinutes > 0 && entry.sleepMinutes === maxSleep) {
            entry.isWinner = true;
        }
    });

    return scorecard;
}

import prisma from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";

export async function getLeaderboardStats(groupId: string, fromDate?: Date, toDate?: Date) {
    const dateFilter = fromDate && toDate ? {
        date: {
            gte: startOfDay(fromDate),
            lte: endOfDay(toDate),
        },
    } : {};

    // 1. Get all members
    const members = await prisma.groupMember.findMany({
        where: { groupId },
        include: { user: true },
    });

    // 2. Get ScoreEvents for range
    const scoreEvents = await prisma.scoreEvent.findMany({
        where: {
            groupId,
            ...dateFilter,
        },
    });

    // 3. Get SleepEntries for range (for avg sleep calculation)
    const sleepEntries = await prisma.sleepEntry.findMany({
        where: {
            groupId,
            ...dateFilter,
        },
    });

    // 4. Aggregate
    const stats = members.map((member) => {
        const userEvents = scoreEvents.filter((e) => e.userId === member.userId);
        const userEntries = sleepEntries.filter((e) => e.userId === member.userId);

        const totalPoints = userEvents.reduce((sum, e) => sum + e.points, 0);
        const totalSleepMinutes = userEntries.reduce((sum, e) => sum + e.sleepMinutes, 0);
        const submissionCount = userEntries.length;

        // Days in range?
        // If range is open (Overall), denominator is... tricky.
        // Usually submission rate = submissions / non-future days since joined?
        // For MVP, just show raw count or avg sleep per submission.

        const avgSleepMinutes = submissionCount > 0 ? totalSleepMinutes / submissionCount : 0;

        return {
            userId: member.userId,
            name: member.user.name,
            image: member.user.image,
            totalPoints,
            avgSleepMinutes,
            submissionCount,
            // userEvents, // Pass if needed for breakdown
        };
    });

    // Sort by Points Descending
    stats.sort((a, b) => b.totalPoints - a.totalPoints);

    return stats;
}

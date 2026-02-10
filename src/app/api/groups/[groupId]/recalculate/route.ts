import { NextResponse } from "next/server";
import { calculateDailyScores } from "@/lib/scoring";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ groupId: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { groupId } = await params;

    // ONE-OFF FIX: Move Siddarth's entry from Feb 9 to Feb 10
    // We'll search for an entry on Feb 9 and move it to Feb 10
    const startOf9 = new Date("2026-02-09T00:00:00.000Z"); // Adjust if needed based on UTC
    const endOf9 = new Date("2026-02-09T23:59:59.999Z");

    // Find the entry (assuming only one for now for simplicity, or just Siddarth's if we knew his ID)
    // Detailed search: Find entries on the 9th
    const entriesToMove = await prisma.sleepEntry.findMany({
        where: {
            groupId,
            date: { gte: startOf9, lte: endOf9 }
        }
    });

    const targetDate = new Date("2026-02-10T12:00:00.000Z"); // Safe mid-day UTC

    for (const entry of entriesToMove) {
        console.log(`Moving entry ${entry.id} from ${entry.date} to ${targetDate}`);
        await prisma.sleepEntry.update({
            where: { id: entry.id },
            data: { date: targetDate }
        });
    }

    // Recalculate for Feb 10
    await calculateDailyScores(groupId, targetDate);

    // Also recalculate for Feb 9 to clear old score event?
    // Actually calculateDailyScores clears events for that day before recalculating.
    // So if we run it for the 9th, it should wipe the old event since no entry exists there anymore.
    const date9 = new Date("2026-02-09T12:00:00.000Z");
    await calculateDailyScores(groupId, date9);

    return NextResponse.json({ success: true, message: `Moved ${entriesToMove.length} entries to Feb 10 and recalculated.` });
}

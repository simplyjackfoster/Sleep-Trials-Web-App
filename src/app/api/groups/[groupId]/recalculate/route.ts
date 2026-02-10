import { NextResponse } from "next/server";
import { calculateDailyScores } from "@/lib/scoring";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ groupId: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { groupId } = await params;

    // Recalculate for today, yesterday, and day before just in case
    const today = new Date();
    await calculateDailyScores(groupId, today);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await calculateDailyScores(groupId, yesterday);

    return NextResponse.json({ success: true, message: "Recalculated scores" });
}

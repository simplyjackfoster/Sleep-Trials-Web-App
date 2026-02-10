import { NextResponse } from "next/server";
import { getDailyScorecard } from "@/lib/history";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ groupId: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { groupId } = await params;
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date"); // ISO string

    if (!dateStr) {
        return NextResponse.json({ error: "Date required" }, { status: 400 });
    }

    const date = new Date(dateStr);

    try {
        const scorecard = await getDailyScorecard(groupId, date);
        return NextResponse.json({ scorecard });
    } catch (e) {
        console.error("History fetch error:", e);
        return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
    }
}

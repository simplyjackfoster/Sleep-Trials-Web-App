import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { calculateDailyScores } from "@/lib/scoring";
import { z } from "zod";

const sleepEntrySchema = z.object({
    date: z.string(), // YYYY-MM-DD
    sleepMinutes: z.number().int().min(0).max(1440), // Max 24h
    source: z.enum(["Oura", "Apple", "Garmin", "Manual"]),
    confidence: z.enum(["MEASURED", "ESTIMATED"]),
    note: z.string().optional(),
});

export async function POST(
    req: Request,
    { params }: { params: Promise<{ groupId: string }> }
) {
    const session = await getServerSession(authOptions);

    // Await params content before using it
    const { groupId } = await params;

    if (!session || !session.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validation = sleepEntrySchema.safeParse(body);

    if (!validation.success) {
        return NextResponse.json({ error: validation.error.message }, { status: 400 });
    }

    const { date, sleepMinutes, source, confidence, note } = validation.data;

    // Verify membership
    const member = await prisma.groupMember.findUnique({
        where: {
            groupId_userId: {
                groupId: groupId,
                userId: session.user.id,
            },
        },
    });

    if (!member) {
        return NextResponse.json({ error: "Not a member of this group" }, { status: 403 });
    }

    try {
        // Normalize date to YYYY-MM-DD 00:00:00 UTC or local start of day?
        // Using simple ISO string parsing and forcing UTC for consistency in DB if using DateTime
        // Valid input date is YYYY-MM-DD
        const entryDate = new Date(date);

        const entry = await prisma.sleepEntry.upsert({
            where: {
                groupId_userId_date: {
                    groupId: groupId,
                    userId: session.user.id,
                    date: entryDate,
                },
            },
            update: {
                sleepMinutes,
                source,
                confidence,
                note,
            },
            create: {
                groupId: groupId,
                userId: session.user.id,
                date: entryDate,
                sleepMinutes,
                source,
                confidence,
                note,
            },
        });

        // Trigger basic scoring calc in background (or await if fast enough)
        await calculateDailyScores(groupId, entryDate);

        return NextResponse.json(entry);
    } catch (error) {
        console.error("Failed to submit sleep:", error);
        return NextResponse.json({ error: "Failed to submit sleep entry" }, { status: 500 });
    }
}

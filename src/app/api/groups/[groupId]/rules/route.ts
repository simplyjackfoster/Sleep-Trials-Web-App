import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const rulesSchema = z.object({
    mode: z.enum(["RANK", "THRESHOLD"]),
    activeFromDate: z.string().optional(), // YYYY-MM-DD, defaults to tomorrow? or today?
    configJson: z.string(), // Valid JSON string provided by UI
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

    // Check ownership
    const group = await prisma.group.findUnique({
        where: { id: groupId },
        select: { ownerId: true },
    });

    if (!group || group.ownerId !== session.user.id) {
        return NextResponse.json({ error: "Only the owner can change rules" }, { status: 403 });
    }

    const body = await req.json();
    const validation = rulesSchema.safeParse(body);

    if (!validation.success) {
        return NextResponse.json({ error: validation.error.message }, { status: 400 });
    }

    const { mode, activeFromDate, configJson } = validation.data;

    // Validate JSON
    try {
        JSON.parse(configJson);
    } catch {
        return NextResponse.json({ error: "Invalid JSON config" }, { status: 400 });
    }

    const effectiveDate = activeFromDate ? new Date(activeFromDate) : new Date();

    try {
        const newConfig = await prisma.scoringConfig.create({
            data: {
                groupId,
                mode,
                activeFromDate: effectiveDate,
                configJson,
            },
        });

        return NextResponse.json(newConfig);
    } catch (error) {
        console.error("Failed to update rules:", error);
        return NextResponse.json({ error: "Failed to update rules" }, { status: 500 });
    }
}

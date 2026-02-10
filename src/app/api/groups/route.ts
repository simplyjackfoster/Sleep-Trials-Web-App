import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { nanoid } from "nanoid";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await req.json();

    if (!name) {
        return NextResponse.json({ error: "Group name is required" }, { status: 400 });
    }

    // Generate a short join code (6 chars)
    const joinCode = nanoid(6).toUpperCase();

    try {
        const group = await prisma.group.create({
            data: {
                name,
                joinCode,
                owner: { connect: { email: session.user.email } },
                members: {
                    create: {
                        user: { connect: { email: session.user.email } },
                        role: "OWNER",
                    },
                },
                // Create a default ScoringConfig
                scoringConfigs: {
                    create: {
                        activeFromDate: new Date(),
                        mode: "THRESHOLD", // Default mode
                        configJson: JSON.stringify({
                            buckets: [
                                { max: 4.5, points: -1 },
                                { min: 4.5, max: 5.5, points: 0 },
                                { min: 5.5, max: 6.5, points: 1 },
                                { min: 6.5, max: 7.5, points: 2 },
                                { min: 7.5, points: 3 },
                            ],
                            nonSubmitPoints: -1,
                            thumbsUpBonus: 1 // Winner bonus
                        })
                    }
                }
            },
        });

        return NextResponse.json(group);
    } catch (error) {
        console.error("Failed to create group:", error);
        return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
    }
}

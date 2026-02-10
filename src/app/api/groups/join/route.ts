import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { joinCode } = await req.json();

    if (!joinCode) {
        return NextResponse.json({ error: "Join code is required" }, { status: 400 });
    }

    try {
        const group = await prisma.group.findUnique({
            where: { joinCode: joinCode.toUpperCase() },
        });

        if (!group) {
            return NextResponse.json({ error: "Invalid join code" }, { status: 404 });
        }

        // Check if already a member
        const existingMember = await prisma.groupMember.findUnique({
            where: {
                groupId_userId: {
                    groupId: group.id,
                    userId: session.user.id,
                },
            },
        });

        if (existingMember) {
            return NextResponse.json({ message: "Already a member", groupId: group.id });
        }

        await prisma.groupMember.create({
            data: {
                groupId: group.id,
                userId: session.user.id,
                role: "MEMBER",
            },
        });

        return NextResponse.json({ message: "Joined successfully", groupId: group.id });
    } catch (error) {
        console.error("Failed to join group:", error);
        return NextResponse.json({ error: "Failed to join group" }, { status: 500 });
    }
}

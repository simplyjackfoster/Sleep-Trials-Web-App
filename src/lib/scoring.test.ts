import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { calculateDailyScores } from "./scoring";
import prisma from "@/lib/prisma";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
    default: {
        scoringConfig: {
            findFirst: vi.fn(),
        },
        groupMember: {
            findMany: vi.fn(),
        },
        sleepEntry: {
            findMany: vi.fn(),
        },
        scoreEvent: {
            deleteMany: vi.fn(),
            createMany: vi.fn(),
            findMany: vi.fn(),
        },
    },
}));

describe("Scoring Engine", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it("should calculate Rank-based scores correctly", async () => {
        // Setup Mocks
        const groupId = "g1";
        const date = new Date("2023-01-01");

        // Config
        (prisma.scoringConfig.findFirst as any).mockResolvedValue({
            mode: "RANK",
            configJson: "{}",
        });

        // Members
        (prisma.groupMember.findMany as any).mockResolvedValue([
            { userId: "u1" },
            { userId: "u2" },
            { userId: "u3" },
        ]);

        // Sleep Entries
        (prisma.sleepEntry.findMany as any).mockResolvedValue([
            { userId: "u1", sleepMinutes: 480 }, // 1st
            { userId: "u2", sleepMinutes: 0 },   // Low/No sleep? Valid entries check.
            { userId: "u3", sleepMinutes: 420 }, // 2nd
        ]);

        // In our logic, 0 minutes is filtered out?
        // "validEntries = entries.filter((e) => e.sleepMinutes > 0)"
        // So u2 is excluded from ranking.

        await calculateDailyScores(groupId, date);

        const createManyCall = (prisma.scoreEvent.createMany as any).mock.calls[0][0];
        const events = createManyCall.data;

        expect(events).toHaveLength(2); // u1 and u3

        // u1 should have 2 points (2 valid submitters)
        // u3 should have 1 point
        const u1Event = events.find((e: any) => e.userId === "u1");
        const u3Event = events.find((e: any) => e.userId === "u3");

        expect(u1Event.points).toBe(2);
        expect(u3Event.points).toBe(1);
    });

    it("should calculate Threshold-based scores correctly", async () => {
        const groupId = "g1";
        const date = new Date("2023-01-01");

        // Config
        (prisma.scoringConfig.findFirst as any).mockResolvedValue({
            mode: "THRESHOLD",
            configJson: JSON.stringify({
                buckets: [
                    { max: 4.5, points: -1 },
                    { min: 4.5, max: 5.5, points: 0 },
                    { min: 5.5, max: 6.5, points: 1 },
                    { min: 6.5, max: 7.5, points: 2 },
                    { min: 7.5, points: 3 },
                ],
                nonSubmitPoints: -1,
                thumbsUpBonus: 1
            }),
        });

        // Members
        (prisma.groupMember.findMany as any).mockResolvedValue([
            { userId: "u1" }, // 8h -> 3 pts + 1 bonus = 4
            { userId: "u2" }, // 5h -> 0 pts
            { userId: "u3" }, // No entry -> -1 pts
        ]);

        // Sleep Entries
        (prisma.sleepEntry.findMany as any).mockResolvedValue([
            { userId: "u1", sleepMinutes: 480 }, // 8h
            { userId: "u2", sleepMinutes: 300 }, // 5h
        ]);

        await calculateDailyScores(groupId, date);

        const createManyCall = (prisma.scoreEvent.createMany as any).mock.calls[0][0];
        const events = createManyCall.data;

        expect(events).toHaveLength(3);

        const u1 = events.find((e: any) => e.userId === "u1");
        const u2 = events.find((e: any) => e.userId === "u2");
        const u3 = events.find((e: any) => e.userId === "u3");

        expect(u1.points).toBe(4); // 3 base + 1 winner
        expect(u2.points).toBe(0); // 4.5-5.5 bucket
        expect(u3.points).toBe(-1); // Non-submit
    });
});

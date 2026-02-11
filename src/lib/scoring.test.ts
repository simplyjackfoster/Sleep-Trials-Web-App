/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi, describe, it, expect, afterEach } from "vitest";
import { calculateDailyScores } from "./scoring";
import prisma from "@/lib/prisma";
import { startOfDay } from "date-fns";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
    default: {
        groupMember: {
            findMany: vi.fn(),
        },
        sleepEntry: {
            findMany: vi.fn(),
        },
        scoreEvent: {
            deleteMany: vi.fn(),
            createMany: vi.fn(),
        },
    },
}));

describe("Scoring Engine", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    const groupId = "g1";
    // Use local time to avoid UTC/timezone offsets messing up startOfDay logic if system is not UTC
    // Month is 0-indexed (0 = Jan)
    const date = new Date(2023, 0, 8);

    it("should calculate Duration Buckets and Daily Winner correctly", async () => {
        // Members
        (prisma.groupMember.findMany as any).mockResolvedValue([
            { userId: "u1" }, // > 7.5h (+3) + Winner (+1) = 4
            { userId: "u2" }, // 7.0h (+2)
            { userId: "u3" }, // 6.5h (+1)
            { userId: "u4" }, // 6.0h (0)
            { userId: "u5" }, // 5.9h (-1)
            { userId: "u6" }, // No submit (-1)
        ]);

        // Sleep Entries (Today)
        (prisma.sleepEntry.findMany as any)
            .mockResolvedValueOnce([
                { userId: "u1", sleepMinutes: 480, date: date }, // 8h
                { userId: "u2", sleepMinutes: 420, date: date }, // 7h
                { userId: "u3", sleepMinutes: 390, date: date }, // 6.5h
                { userId: "u4", sleepMinutes: 360, date: date }, // 6h
                { userId: "u5", sleepMinutes: 354, date: date }, // 5.9h
            ])
            // History (for streaks) - Empty for this test
            .mockResolvedValueOnce([]);

        await calculateDailyScores(groupId, date);

        const createManyCall = (prisma.scoreEvent.createMany as any).mock.calls[0][0];
        const events = createManyCall.data;

        expect(events).toHaveLength(6);

        const getPoints = (uid: string) => events.find((e: any) => e.userId === uid)?.points;

        expect(getPoints("u1")).toBe(4); // 3 (bucket) + 1 (winner)
        expect(getPoints("u2")).toBe(2); // 2 (bucket)
        expect(getPoints("u3")).toBe(1); // 1 (bucket)
        expect(getPoints("u4")).toBe(0); // 0 (bucket)
        expect(getPoints("u5")).toBe(-1); // -1 (bucket)
        expect(getPoints("u6")).toBe(-1); // -1 (non-submit)
    });

    it("should calculate 7-day Streak Bonus (+3) correctly", async () => {
        (prisma.groupMember.findMany as any).mockResolvedValue([{ userId: "u1" }]);

        // Today: 7h
        (prisma.sleepEntry.findMany as any).mockResolvedValueOnce([
            { userId: "u1", sleepMinutes: 420, date: date },
        ]);

        // History: Need 6 previous days of >= 420m to complete a 7-day streak (inclusive of today)
        // Using startOfDay to ensure dates align with scoring.ts logic
        const baseDate = startOfDay(date);

        const history = [];
        // Gen T-1 to T-6
        for (let i = 1; i <= 6; i++) {
            const d = new Date(baseDate);
            d.setDate(d.getDate() - i);
            history.push({ userId: "u1", sleepMinutes: 420, date: d });
        }
        // T-7 missing

        (prisma.sleepEntry.findMany as any).mockResolvedValueOnce(history);

        await calculateDailyScores(groupId, date);

        const createManyCall = (prisma.scoreEvent.createMany as any).mock.calls[0][0];
        const event = createManyCall.data[0];

        // 7h today = +2 bucket.
        // Streak 7 = +3.
        // Winner = +0
        // Total = 5.
        expect(event.points).toBe(5);
        expect(event.reason).toContain("7-day Streak!");
    });

    it("should calculate >7-day Streak Bonus (+1) correctly", async () => {
        (prisma.groupMember.findMany as any).mockResolvedValue([{ userId: "u1" }]);

        // Today: 7h
        (prisma.sleepEntry.findMany as any).mockResolvedValueOnce([
            { userId: "u1", sleepMinutes: 420, date: date },
        ]);

        // History: 7 previous days (T-1 to T-7)
        const baseDate = startOfDay(date);
        const history = [];
        for (let i = 1; i <= 7; i++) {
            const d = new Date(baseDate);
            d.setDate(d.getDate() - i);
            history.push({ userId: "u1", sleepMinutes: 420, date: d });
        }

        (prisma.sleepEntry.findMany as any).mockResolvedValueOnce(history);

        await calculateDailyScores(groupId, date);

        const createManyCall = (prisma.scoreEvent.createMany as any).mock.calls[0][0];
        const event = createManyCall.data[0];

        // 7h = +2.
        // Streak > 7 = +1.
        // Total = 3.
        expect(event.points).toBe(3);
        expect(event.reason).toContain("Streak Continued");
    });

    it("should NOT award streak bonus if a day is missed", async () => {
        (prisma.groupMember.findMany as any).mockResolvedValue([{ userId: "u1" }]);

        // Today: 7h
        (prisma.sleepEntry.findMany as any).mockResolvedValueOnce([
            { userId: "u1", sleepMinutes: 420, date: date },
        ]);

        // History: T-1 good, T-2 BAD, T-3 good...
        const baseDate = startOfDay(date);
        const history = [
            { userId: "u1", sleepMinutes: 420, date: new Date(new Date(baseDate).setDate(baseDate.getDate() - 1)) },
            // T-2 missing/bad
            { userId: "u1", sleepMinutes: 420, date: new Date(new Date(baseDate).setDate(baseDate.getDate() - 3)) },
        ];

        (prisma.sleepEntry.findMany as any).mockResolvedValueOnce(history);

        await calculateDailyScores(groupId, date);

        const event = (prisma.scoreEvent.createMany as any).mock.calls[0][0].data[0];

        // 7h = +2.
        // Streak = 0.
        // Total = 2.
        expect(event.points).toBe(2);
    });
});

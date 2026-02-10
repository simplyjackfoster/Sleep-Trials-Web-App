import { PrismaClient } from "@prisma/client";
import { subDays, format } from "date-fns";
import { calculateDailyScores } from "../src/lib/scoring";

const prisma = new PrismaClient();

async function main() {
    console.log("Start seeding ...");

    // Clean up
    await prisma.scoreEvent.deleteMany();
    await prisma.sleepEntry.deleteMany();
    await prisma.groupMember.deleteMany();
    await prisma.scoringConfig.deleteMany();
    await prisma.group.deleteMany();
    await prisma.user.deleteMany();

    // Create Users
    const users = await Promise.all([
        prisma.user.create({ data: { name: "Alice", email: "alice@example.com" } }),
        prisma.user.create({ data: { name: "Bob", email: "bob@example.com" } }),
        prisma.user.create({ data: { name: "Charlie", email: "charlie@example.com" } }),
        prisma.user.create({ data: { name: "David", email: "david@example.com" } }),
    ]);

    // Create Group
    const group = await prisma.group.create({
        data: {
            name: "The Dream Team",
            joinCode: "DREAM1",
            ownerId: users[0].id,
            members: {
                create: users.map((u, i) => ({
                    userId: u.id,
                    role: i === 0 ? "OWNER" : "MEMBER",
                })),
            },
            scoringConfigs: {
                create: {
                    activeFromDate: subDays(new Date(), 30), // Active since 30 days ago
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
                },
            },
        },
    });

    console.log(`Created group: ${group.name} (${group.id})`);

    // Generate Sleep Entries for last 14 days
    const today = new Date();

    for (let i = 14; i >= 0; i--) {
        const day = subDays(today, i);
        console.log(`Processing ${format(day, "yyyy-MM-dd")}`);

        for (const user of users) {
            // Randomize sleep: 4h to 9h
            // Some variance: Bob is good sleeper, David is bad.
            let baseHours = 7;
            if (user.name === "Bob") baseHours = 8;
            if (user.name === "David") baseHours = 5;

            const randomMinutes = Math.floor(Math.random() * 60) - 30; // +/- 30m
            const sleepMinutes = (baseHours * 60) + randomMinutes;

            // Random non-submission (10% chance)
            if (Math.random() > 0.9) continue;

            await prisma.sleepEntry.create({
                data: {
                    groupId: group.id,
                    userId: user.id,
                    date: day,
                    sleepMinutes,
                    source: ["Oura", "Apple", "Garmin", "Manual"][Math.floor(Math.random() * 4)],
                    confidence: "MEASURED",
                },
            });
        }

        // Calculate scores for this day
        await calculateDailyScores(group.id, day);
    }

    console.log("Seeding finished.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

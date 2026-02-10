import { getLeaderboardStats } from "@/lib/leaderboard";
import { subDays } from "date-fns";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import clsx from "clsx";

export default async function LeaderboardPage({
    params,
    searchParams,
}: {
    params: Promise<{ groupId: string }>;
    searchParams: Promise<{ range?: string }>;
}) {
    // const session = await getServerSession(authOptions); // Removed unused session

    // Await params content before using it
    const { groupId } = await params;
    const { range } = await searchParams; // "7d" or "all" or "30d"

    const rangeKey = range || "7d";

    let fromDate: Date | undefined;
    let toDate: Date | undefined;

    if (rangeKey === "7d") {
        toDate = new Date();
        fromDate = subDays(toDate, 6); // Last 7 days inclusive
    } else if (rangeKey === "30d") {
        toDate = new Date();
        fromDate = subDays(toDate, 29);
    }
    // "all" = undefined

    const stats = await getLeaderboardStats(groupId, fromDate, toDate);

    // HARDCODED RULES
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const configMode: any = "THRESHOLD";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rules: any = {
        buckets: [
            { max: 4.5, points: -1 },
            { min: 4.5, max: 5.5, points: 0 },
            { min: 5.5, max: 6.5, points: 1 },
            { min: 6.5, max: 7, points: 2 },
            { min: 7, points: 3 }
        ],
        nonSubmitPoints: -1,
        thumbsUpBonus: 1
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buckets: any[] = rules.buckets;

    return (
        <div className="min-h-screen bg-slate-950 text-white p-4 pb-20">
            <div className="max-w-xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link
                        href={`/g/${groupId}`}
                        className="p-2 -ml-2 rounded-full hover:bg-slate-800 transition"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="text-xl font-bold">Leaderboard</h1>
                </div>

                {/* Tabs */}
                <div className="flex p-1 bg-slate-900 rounded-xl">
                    {[
                        { key: "7d", label: "Last 7 Days" },
                        { key: "30d", label: "30 Days" },
                        { key: "all", label: "All Time" },
                    ].map((tab) => (
                        <Link
                            key={tab.key}
                            href={`/g/${groupId}/leaderboard?range=${tab.key}`}
                            className={clsx(
                                "flex-1 py-2 text-center text-sm font-semibold rounded-lg transition",
                                rangeKey === tab.key
                                    ? "bg-indigo-600 text-white shadow-lg"
                                    : "text-slate-400 hover:text-white"
                            )}
                        >
                            {tab.label}
                        </Link>
                    ))}
                </div>

                {/* Table */}
                <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider">
                                <th className="p-4 font-semibold">Rank</th>
                                <th className="p-4 font-semibold">User</th>
                                <th className="p-4 font-semibold text-right">Avg Sleep</th>
                                <th className="p-4 font-semibold text-right">Points</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {stats.map((user, index) => (
                                <tr key={user.userId} className={clsx(index < 3 ? "bg-slate-800/30" : "")}>
                                    <td className="p-4 font-mono font-bold text-slate-500">
                                        {index + 1}
                                        {index === 0 && " 👑"}
                                        {index === 1 && " 🥈"}
                                        {index === 2 && " 🥉"}
                                    </td>
                                    <td className="p-4 font-medium flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs overflow-hidden">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            {user.image ? <img src={user.image} alt={user.name ?? "U"} /> : (user.name?.[0] || "?").toUpperCase()}
                                        </div>
                                        {user.name}
                                    </td>
                                    <td className="p-4 text-right text-slate-300">
                                        {Math.floor(user.avgSleepMinutes / 60)}h {Math.round(user.avgSleepMinutes % 60)}m
                                    </td>
                                    <td className="p-4 text-right font-bold text-indigo-400 text-lg">
                                        {user.totalPoints}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {stats.length === 0 && (
                        <div className="p-8 text-center text-slate-500">No data for this period.</div>
                    )}
                </div>

                {/* Rules Explanation */}
                <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-800 text-sm">
                    <h3 className="text-slate-400 font-bold mb-3 uppercase text-xs tracking-wider">How Scoring Works</h3>
                    {configMode === "THRESHOLD" && rules ? (
                        <div className="space-y-2 text-slate-300">
                            <p>Total daily points are calculated based on your sleep duration:</p>
                            <ul className="list-disc list-inside space-y-1 ml-2 text-slate-400">
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {buckets.map((b: any, i: number) => (
                                    <li key={i}>
                                        {/* Logic to format bucket text safely */}
                                        <strong>{b.points > 0 ? "+" : ""}{b.points} point{b.points !== 1 ? "s" : ""}</strong>
                                        {" "}for{" "}
                                        {b.min !== undefined && b.max !== undefined
                                            ? `${b.min} - ${b.max} hours`
                                            : b.min !== undefined
                                                ? `${b.min}+ hours`
                                                : `less than ${b.max} hours`
                                        }.
                                    </li>
                                ))}
                                <li><strong>{rules.nonSubmitPoints > 0 ? "+" : ""}{rules.nonSubmitPoints} point{rules.nonSubmitPoints !== 1 ? "s" : ""}</strong> for missing a log.</li>
                            </ul>
                            <p className="pt-2 text-yellow-500 text-xs">
                                🏆 <strong>Bonus:</strong> +{rules.thumbsUpBonus} point if you sleep the most in the group that night!
                            </p>
                        </div>
                    ) : (
                        <div className="text-slate-400 space-y-2">
                            <p>Rank Based Scoring:</p>
                            <ul className="list-disc list-inside ml-2">
                                <li>1st place gets N points (number of participants)</li>
                                <li>Last place gets 1 point</li>
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            {/* Debug Actions */}
            <form action={async () => {
                "use server";
                const { calculateDailyScores } = await import("@/lib/scoring");
                // Recalculate last 7 days
                const today = new Date();
                for (let i = 0; i < 7; i++) {
                    const d = new Date(today);
                    d.setDate(d.getDate() - i);
                    await calculateDailyScores(groupId, d);
                }
            }}>
                <button type="submit" className="w-full mt-4 p-3 bg-red-900/20 text-red-400 text-xs rounded-lg hover:bg-red-900/40 transition">
                    Force Recalculate Scores (Debug)
                </button>
            </form>
        </div>
    );
}

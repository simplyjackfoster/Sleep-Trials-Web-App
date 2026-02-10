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
                    <div className="space-y-2 text-slate-300">
                        <p>Total daily points are calculated based on your sleep duration:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2 text-slate-400">
                            <li><strong>-1 point</strong> for sleeping less than 4.5 hours (or missing a log).</li>
                            <li><strong>0 points</strong> for 4.5 - 5.5 hours.</li>
                            <li><strong>1 point</strong> for 5.5 - 6.5 hours.</li>
                            <li><strong>2 points</strong> for 6.5 - 7.0 hours.</li>
                            <li><strong>3 points</strong> for 7.0+ hours.</li>
                        </ul>
                        <p className="pt-2 text-yellow-500 text-xs">
                            🏆 <strong>Bonus:</strong> +1 point if you sleep the most in the group that night!
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

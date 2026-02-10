import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { Moon, Plus, Trophy } from "lucide-react";

export default async function GroupDashboard({
    params,
}: {
    params: Promise<{ groupId: string }>;
}) {
    const session = await getServerSession(authOptions);

    // Await params content before using it
    const { groupId } = await params;

    if (!session || !session.user?.email) {
        redirect("/login");
    }

    const group = await prisma.group.findUnique({
        where: { id: groupId },
        include: {
            members: {
                include: {
                    user: true,
                },
            },
            sleepEntries: {
                // Fetch entries for "today" (approximate, simpler to filter in memory for MVP or just generic helper)
                // For MVP dashboard, let's just show "Last 24h" or "Latest entries"
                orderBy: { date: "desc" },
                take: 20,
            },
        },
    });

    if (!group) {
        notFound();
    }

    const isMember = group.members.some((m) => m.user.email === session.user?.email);
    if (!isMember) {
        // Or show a "Join" button? For now, redirect or 403.
        return <div>You are not a member of this group.</div>;
    }

    // Determine "Today" (local to server? User timezone is tricky server-side.
    // For MVP, we'll just list recent submissions.
    // A better approach for "Today's Status" is client-side date or passing a date param.
    // Let's iterate on "Today" later. For now, show "Recent Activity".

    return (
        <div className="min-h-screen bg-slate-950 text-white pb-20">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-md border-b border-white/10 p-4 mb-4">
                <div className="max-w-xl mx-auto flex items-center justify-between">
                    <h1 className="text-xl font-bold truncate">{group.name}</h1>
                    <div className="text-xs text-slate-400 font-mono bg-slate-800 px-2 py-1 rounded">
                        CODE: <span className="text-indigo-400 select-all">{group.joinCode}</span>
                    </div>
                </div>
            </header>

            <main className="max-w-xl mx-auto px-4 space-y-8">
                {/* Actions */}
                <div className="grid grid-cols-2 gap-4">
                    <Link
                        href={`/g/${groupId}/submit`}
                        className="flex flex-col items-center justify-center p-4 bg-indigo-600 rounded-xl hover:bg-indigo-500 transition shadow-lg shadow-indigo-900/20"
                    >
                        <Plus className="w-8 h-8 mb-2" />
                        <span className="font-bold">Log Sleep</span>
                    </Link>
                    <Link
                        href={`/g/${groupId}/leaderboard`}
                        className="flex flex-col items-center justify-center p-4 bg-slate-800 rounded-xl hover:bg-slate-700 transition border border-slate-700"
                    >
                        <Trophy className="w-8 h-8 mb-2 text-yellow-500" />
                        <span className="font-bold">Leaderboard</span>
                    </Link>
                </div>

                {/* Daily Status / Recent Activity */}
                <section>
                    <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <Moon className="w-5 h-5 text-indigo-400" />
                        Recent Activity
                    </h2>
                    <div className="bg-slate-900 rounded-xl overflow-hidden shadow-sm border border-slate-800">
                        {group.sleepEntries.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">
                                No sleep recorded yet. Be the first!
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-800">
                                {group.sleepEntries.map((entry) => {
                                    const member = group.members.find((m) => m.userId === entry.userId);
                                    // Use a key that combines unique identifiers
                                    return (
                                        <div key={`${entry.id}-${entry.updatedAt.getTime()}`} className="p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold overflow-hidden">
                                                    {member?.user.image ? (
                                                        <img src={member.user.image} alt={member.user.name ?? "User"} />
                                                    ) : (
                                                        (member?.user.name?.[0] || "?").toUpperCase()
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-medium">{member?.user.name}</p>
                                                    <p className="text-xs text-slate-400">
                                                        {format(entry.date, "MMM d")} • {entry.source}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
                                                    {Math.floor(entry.sleepMinutes / 60)}h {entry.sleepMinutes % 60}m
                                                </span>
                                                {entry.note && (
                                                    <p className="text-xs text-slate-500 max-w-[100px] truncate">{entry.note}</p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </section>

                {/* Members List */}
                <section>
                    <h2 className="text-lg font-semibold mb-3">Members ({group.members.length})</h2>
                    <div className="flex flex-wrap gap-2">
                        {group.members.map(member => (
                            <div key={member.id} className="bg-slate-900 px-3 py-1.5 rounded-full text-sm border border-slate-800">
                                {member.user.name}
                            </div>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}

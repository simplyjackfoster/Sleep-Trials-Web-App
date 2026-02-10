"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import clsx from "clsx";
import Link from "next/link";
import { ArrowLeft, Trophy, Moon, Flame } from "lucide-react";

// Types (mirrored from server action, defined inline for client simplicity or imported)
type DailyScorecardEntry = {
    userId: string;
    userName: string | null; // Fixed: string | null to match server return
    userImage: string | null;
    sleepMinutes: number;
    points: number;
    reason: string | null;
    rank: number;
    isWinner: boolean;
};

export default function HistoryPage({ params }: { params: Promise<{ groupId: string }> }) {
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [scorecard, setScorecard] = useState<DailyScorecardEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [groupId, setGroupId] = useState<string>("");

    // Unwrap params
    useEffect(() => {
        params.then((p) => setGroupId(p.groupId));
    }, [params]);

    // Fetch data when date or groupId changes
    useEffect(() => {
        if (!groupId || !selectedDate) return;

        async function fetchData() {
            setLoading(true);
            try {
                // Ensure groupId is available before fetching
                if (!groupId) return;
                const res = await fetch(`/api/groups/${groupId}/history?date=${selectedDate?.toISOString()}`);
                if (res.ok) {
                    const data = await res.json();
                    // Ensure the API returns { scorecard: [] }
                    setScorecard(data.scorecard || []);
                }
            } catch (e) {
                console.error("Failed to fetch history", e);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [groupId, selectedDate]);

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
                    <h1 className="text-xl font-bold">Daily History</h1>
                </div>

                {/* Calendar Section */}
                <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 flex justify-center">
                    <style>{`
                        .rdp { --rdp-cell-size: 40px; --rdp-accent-color: #6366f1; --rdp-background-color: #312e81; }
                        .rdp-day_selected { background-color: var(--rdp-accent-color); color: white; }
                        .rdp-day_today { color: #818cf8; font-weight: bold; }
                    `}</style>
                    <DayPicker
                        mode="single"
                        required
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={{ after: new Date() }} // Can't see future
                        modifiersClassNames={{
                            selected: "bg-indigo-600 text-white rounded-full",
                        }}
                        className="text-slate-300"
                    />
                </div>

                {/* Scorecard Section */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-slate-300 flex items-center gap-2">
                        {selectedDate ? format(selectedDate, "EEEE, MMMM do, yyyy") : "Select a date"}
                    </h2>

                    {loading ? (
                        <div className="text-center py-12 text-slate-500 animate-pulse">Loading scores...</div>
                    ) : scorecard.length === 0 ? (
                        <div className="p-8 text-center bg-slate-900/50 rounded-xl border border-slate-800 text-slate-500">
                            No data available for this date.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {scorecard.map((entry) => (
                                <div
                                    key={entry.userId}
                                    className={clsx(
                                        "p-4 rounded-xl border flex items-center gap-4 transition",
                                        entry.isWinner
                                            ? "bg-indigo-900/20 border-indigo-500/50"
                                            : "bg-slate-900 border-slate-800"
                                    )}
                                >
                                    {/* Rank/Avatar */}
                                    <div className="flex flex-col items-center gap-1 min-w-[3rem]">
                                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold overflow-hidden border-2 border-slate-600">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            {entry.userImage ? <img src={entry.userImage} alt={entry.userName || "U"} /> : (entry.userName?.[0] || "?").toUpperCase()}
                                        </div>
                                        {entry.isWinner && <span className="text-xs text-yellow-400 font-bold">WINNER</span>}
                                    </div>

                                    {/* Details */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className="font-semibold truncate">{entry.userName || "Unknown"}</h3>
                                            <div className={clsx(
                                                "px-2 py-0.5 rounded text-xs font-bold",
                                                entry.points > 0 ? "bg-green-900/30 text-green-400" :
                                                    entry.points < 0 ? "bg-red-900/30 text-red-400" : "bg-slate-800 text-slate-400"
                                            )}>
                                                {entry.points > 0 ? "+" : ""}{entry.points} pts
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-slate-400">
                                            <div className="flex items-center gap-1.5">
                                                <Moon className="w-3.5 h-3.5" />
                                                <span>
                                                    {Math.floor(entry.sleepMinutes / 60)}h {entry.sleepMinutes % 60}m
                                                </span>
                                            </div>
                                            {/* Could add reason here if verbose, but let's keep it clean */}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, AlertTriangle } from "lucide-react";

export default function RulesPage({
    params,
}: {
    params: Promise<{ groupId: string }>;
}) {
    const router = useRouter();
    const { groupId } = use(params);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [mode, setMode] = useState<"RANK" | "THRESHOLD">("THRESHOLD");
    const [jsonConfig, setJsonConfig] = useState(JSON.stringify({
        buckets: [
            { max: 4.5, points: -1 },
            { min: 4.5, max: 5.5, points: 0 },
            { min: 5.5, max: 6.5, points: 1 },
            { min: 6.5, max: 7.5, points: 2 },
            { min: 7.5, points: 3 },
        ],
        nonSubmitPoints: -1,
        thumbsUpBonus: 1
    }, null, 2));

    async function onSubmit() {
        setIsLoading(true);
        setError("");

        try {
            const response = await fetch(`/api/groups/${groupId}/rules`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    mode,
                    configJson: jsonConfig,
                    activeFromDate: new Date().toISOString(), // Immediate effect for MVP
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to save rules");
            }

            router.push(`/g/${groupId}`);
            router.refresh();
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("An unknown error occurred");
            }
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white p-4">
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <Link
                        href={`/g/${groupId}`}
                        className="p-2 -ml-2 rounded-full hover:bg-slate-800 transition"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="text-xl font-bold">Scoring Rules</h1>
                </div>

                <div className="p-4 bg-yellow-900/20 text-yellow-200 rounded-lg flex items-start gap-3 border border-yellow-800">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm">Changes will apply to scoring calculations from today onwards. Past scores may be recalculated if you re-trigger them.</p>
                </div>

                <div className="space-y-4">
                    <label className="block text-sm font-medium text-slate-300">Scoring Mode</label>
                    <div className="flex gap-4">
                        <button
                            onClick={() => setMode("THRESHOLD")}
                            className={`flex-1 py-3 px-4 rounded-lg border transition ${mode === "THRESHOLD" ? "bg-indigo-600 border-indigo-500 font-bold" : "bg-slate-800 border-slate-700 hover:bg-slate-700"}`}
                        >
                            Threshold (Buckets)
                        </button>
                        <button
                            onClick={() => setMode("RANK")}
                            className={`flex-1 py-3 px-4 rounded-lg border transition ${mode === "RANK" ? "bg-indigo-600 border-indigo-500 font-bold" : "bg-slate-800 border-slate-700 hover:bg-slate-700"}`}
                        >
                            Rank Based
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-300">Configuration (JSON)</label>
                    <textarea
                        value={jsonConfig}
                        onChange={(e) => setJsonConfig(e.target.value)}
                        className="w-full h-64 bg-slate-900 border border-slate-700 rounded-lg p-4 font-mono text-sm focus:ring-2 focus:ring-indigo-500 transition"
                    />
                    <p className="text-xs text-slate-500">
                        Configure buckets, points, and bonuses. Be careful with JSON syntax.
                    </p>
                </div>

                {error && <div className="text-red-400 text-sm">{error}</div>}

                <button
                    onClick={onSubmit}
                    disabled={isLoading}
                    className="w-full flex justify-center items-center py-3 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition disabled:opacity-50"
                >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save Rules</>}
                </button>
            </div>
        </div>
    );
}

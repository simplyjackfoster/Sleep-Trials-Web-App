"use client";

// import { use, useState } from "react"; // Unused useEffect, remove if not needed. 
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
// import { parseISO, startOfDay } from "date-fns"; // Removed unused imports // Removed subDays
import { format } from "date-fns"; // Keeping format as it's used. The instruction's edit for this line seems to be an error.
import { Loader2, ArrowLeft } from "lucide-react"; // Removed Clock
import Link from "next/link";
import clsx from "clsx";

const sleepEntrySchema = z.object({
    date: z.string(),
    hours: z.coerce.number().min(0).max(24),
    minutes: z.coerce.number().min(0).max(59),
    source: z.enum(["Oura", "Apple", "Garmin", "Manual"]),
    confidence: z.enum(["MEASURED", "ESTIMATED"]).default("MEASURED"),
    note: z.string().optional(),
});

type FormValues = z.infer<typeof sleepEntrySchema>;

export default function SubmitSleepPage({
    params,
}: {
    params: Promise<{ groupId: string }>;
}) {
    const router = useRouter();

    // Unwrap params using React 19's use() API or await
    // Since we are in a client component, we need to unwrap it if it's a promise?
    // Next 15 `params` prop in Client Components is a Promise? 
    // Wait, Next 15 params are async in Server Components, but in Client?
    // It's safer to use React.use() if available, or just assume it's passed as prop (Next 13/14 behavior)
    // But let's check recent Next.js trends. For Next 15, `params` is a Promise.
    // We can use `use()` if React 19, or just useEffect to unwrap?
    // Let's cheat and use `use()` if available or just assume it's resolved if older Next.
    // Actually, standard way now is: `const { groupId } = use(params);` if React 19.
    // Since we installed `react@19.0.0`, we can use `use`.

    const { groupId } = use(params);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [pendingData, setPendingData] = useState<FormValues | null>(null);

    const form = useForm<FormValues>({
        resolver: zodResolver(sleepEntrySchema) as Resolver<FormValues>,
        defaultValues: {
            date: format(new Date(), "yyyy-MM-dd"), // Default to today
            hours: 7,
            minutes: 0,
            source: "Manual",
            confidence: "MEASURED",
            note: "",
        },
    });

    const handleInitialSubmit = (values: FormValues) => {
        setPendingData(values);
        setShowConfirmation(true);
    };

    async function handleFinalSubmit() {
        if (!pendingData) return;

        setIsLoading(true);
        setError("");

        // Calculate total minutes
        const sleepMinutes = pendingData.hours * 60 + pendingData.minutes;

        try {
            const response = await fetch(`/api/groups/${groupId}/sleep`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    date: pendingData.date,
                    sleepMinutes,
                    source: pendingData.source,
                    confidence: pendingData.confidence,
                    note: pendingData.note,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to submit sleep");
            }

            router.push(`/g/${groupId}`);
            router.refresh();
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("An unknown error occurred");
            }
            setShowConfirmation(false); // Close on error to show error message
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white p-4">
            <div className="max-w-md mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link
                        href={`/g/${groupId}`}
                        className="p-2 -ml-2 rounded-full hover:bg-slate-800 transition"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="text-xl font-bold">Log Sleep</h1>
                </div>

                <form onSubmit={form.handleSubmit(handleInitialSubmit)} className="space-y-6">
                    {/* Date */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Night of</label>
                        <input
                            type="date"
                            {...form.register("date")}
                            className="w-full bg-slate-800 border-none rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500"
                        />
                        <p className="text-xs text-slate-500">Usually the date you woke up.</p>
                    </div>

                    {/* Duration */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Duration</label>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <input
                                        type="number"
                                        {...form.register("hours")}
                                        className="w-full bg-slate-800 border-none rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 text-center text-lg font-bold"
                                    />
                                    <div className="absolute right-3 top-3.5 text-slate-500 text-sm">hr</div>
                                </div>
                            </div>
                            <div className="flex-1">
                                <div className="relative">
                                    <input
                                        type="number"
                                        {...form.register("minutes")}
                                        className="w-full bg-slate-800 border-none rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 text-center text-lg font-bold"
                                    />
                                    <div className="absolute right-3 top-3.5 text-slate-500 text-sm">min</div>
                                </div>
                            </div>
                        </div>
                        {form.formState.errors.hours && <p className="text-red-500 text-sm">Invalid hours</p>}
                    </div>

                    {/* Source */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Source</label>
                        <div className="grid grid-cols-2 gap-2">
                            {["Oura", "Apple", "Garmin", "Manual"].map((s) => (
                                <label
                                    key={s}
                                    className={clsx(
                                        "cursor-pointer flex items-center justify-center p-3 rounded-lg border transition",
                                        form.watch("source") === s
                                            ? "bg-indigo-600 border-indigo-500 text-white font-bold"
                                            : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
                                    )}
                                >
                                    <input
                                        type="radio"
                                        value={s}
                                        {...form.register("source")}
                                        className="sr-only"
                                    />
                                    {s}
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Note */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Note (Optional)</label>
                        <textarea
                            {...form.register("note")}
                            className="w-full bg-slate-800 border-none rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
                            placeholder="Napped for 20 mins, felt groggy..."
                        />
                    </div>

                    {/* Error */}
                    {error && <div className="p-3 bg-red-900/50 text-red-200 rounded-lg text-sm text-center">{error}</div>}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex justify-center items-center py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-white font-bold text-lg hover:opacity-90 transition shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                    >
                        Submit Check
                    </button>
                </form>

                {/* Confirmation Modal */}
                {showConfirmation && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
                            <div className="text-center space-y-2">
                                <div className="mx-auto w-12 h-12 bg-yellow-500/20 text-yellow-500 rounded-full flex items-center justify-center mb-4">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                                        <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold text-white">Evidence Required</h3>
                                <p className="text-slate-400">
                                    Please confirm that you have sent screenshot evidence of your sleep score to the group chat.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setShowConfirmation(false)}
                                    className="py-3 px-4 rounded-xl bg-slate-800 text-slate-300 font-medium hover:bg-slate-700 transition"
                                >
                                    No, go back
                                </button>
                                <button
                                    onClick={handleFinalSubmit}
                                    disabled={isLoading}
                                    className="py-3 px-4 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold hover:opacity-90 transition flex justify-center items-center"
                                >
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Yes, I sent it"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, subDays } from "date-fns";
import { Loader2, ArrowLeft, Clock } from "lucide-react";
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

type FormValues = z.infer<typeof sleepEntrySchema> & {
    hours: number;
    minutes: number;
};

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

    const form = useForm<FormValues>({
        resolver: zodResolver(sleepEntrySchema),
        defaultValues: {
            date: format(new Date(), "yyyy-MM-dd"), // Default to today
            hours: 7,
            minutes: 0,
            source: "Manual",
            confidence: "MEASURED",
            note: "",
        },
    });

    async function onSubmit(values: FormValues) {
        setIsLoading(true);
        setError("");

        // Calculate total minutes
        const sleepMinutes = values.hours * 60 + values.minutes;

        try {
            const response = await fetch(`/api/groups/${groupId}/sleep`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    date: values.date,
                    sleepMinutes,
                    source: values.source,
                    confidence: values.confidence,
                    note: values.note,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to submit sleep");
            }

            router.push(`/g/${groupId}`);
            router.refresh();
        } catch (err: any) {
            setError(err.message);
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

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                        {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Submit Sleep"}
                    </button>
                </form>
            </div>
        </div>
    );
}

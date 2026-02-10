"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
    joinCode: z.string().min(6, "Join code must be 6 characters").max(6),
});

export default function JoinGroupPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            joinCode: "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        setError("");

        try {
            const response = await fetch("/api/groups/join", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || data.message || "Failed to join group");
            }

            if (data.groupId) {
                router.push(`/g/${data.groupId}`);
                router.refresh();
            }
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
        <div className="flex min-h-screen items-center justify-center p-4 bg-slate-950 text-white">
            <div className="w-full max-w-md space-y-8 bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-xl">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-center">Join a Group</h2>
                    <p className="mt-2 text-center text-slate-400">Enter the code shared by your friend.</p>
                </div>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-2">
                        <label htmlFor="joinCode" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Join Code
                        </label>
                        <input
                            id="joinCode"
                            {...form.register("joinCode")}
                            className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 uppercase tracking-widest text-center font-mono text-lg"
                            placeholder="XT92BA"
                            maxLength={6}
                            disabled={isLoading}
                        />
                        {form.formState.errors.joinCode && (
                            <p className="text-sm text-red-500">{form.formState.errors.joinCode.message}</p>
                        )}
                    </div>

                    {error && <div className="text-red-500 text-sm text-center">{error}</div>}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex justify-center items-center py-3 px-4 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Join Group
                    </button>
                </form>
            </div>
        </div>
    );
}

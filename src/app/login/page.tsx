"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

function LoginContent() {
    const { data: session } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") || "/";
    const [email, setEmail] = useState("");

    useEffect(() => {
        if (session) {
            router.push(callbackUrl);
        }
    }, [session, router, callbackUrl]);

    return (
        <div className="w-full max-w-md space-y-8">
            <div className="text-center">
                <h1 className="text-4xl font-bold tracking-tight text-indigo-500">Sleep Trials</h1>
                <p className="mt-2 text-slate-400">Sign in to track your sleep and compete.</p>
            </div>

            <div className="mt-8 space-y-4">
                <button
                    onClick={() => signIn("google", { callbackUrl })}
                    className="flex w-full items-center justify-center rounded-lg bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100 transition"
                >
                    {/* Google Icon SVG */}
                    <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                        <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            fill="#4285F4"
                        />
                        <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                        />
                        <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            fill="#FBBC05"
                        />
                        <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            fill="#EA4335"
                        />
                    </svg>
                    Continue with Google
                </button>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-700" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="bg-slate-900 px-2 text-slate-500">Or continue with email</span>
                    </div>
                </div>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        signIn("email", { email, callbackUrl });
                    }}
                    className="space-y-4"
                >
                    <div>
                        <label htmlFor="email" className="sr-only">
                            Email address
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-indigo-500"
                            placeholder="Enter your email"
                        />
                    </div>
                    <button
                        type="submit"
                        className="flex w-full justify-center rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition"
                    >
                        Sign in with Email
                    </button>
                </form>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-900 text-white">
            <Suspense fallback={<div className="text-slate-500">Loading...</div>}>
                <LoginContent />
            </Suspense>
        </div>
    );
}

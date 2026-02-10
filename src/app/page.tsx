import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session?.user?.email) {
    // Check if user has any groups
    const userWithGroups = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        memberships: {
          select: { groupId: true },
          take: 1,
        },
      },
    });

    if (userWithGroups?.memberships && userWithGroups.memberships.length > 0) {
      // Redirect to the first group
      redirect(`/g/${userWithGroups.memberships[0].groupId}`);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-950 text-white">
      <div className="max-w-2xl text-center space-y-8">
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent pb-2">
          Sleep Trials
        </h1>
        <p className="text-xl md:text-2xl text-slate-400">
          The competitive sleep tracker for friend groups.
          <br />
          Score points. Build streaks. Sleep better.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
          {session ? (
            <>
              <Link
                href="/groups/new"
                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold text-lg transition shadow-lg shadow-indigo-500/20"
              >
                Create a Group
              </Link>
              <Link
                href="/groups/join"
                className="px-8 py-4 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-lg border border-slate-700 transition"
              >
                Join with Code
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              className="px-8 py-4 bg-white text-slate-900 hover:bg-slate-100 rounded-xl font-bold text-lg transition shadow-xl"
            >
              Get Started
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { SignInButton } from "@/components/SignInButton";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const session = await getServerSession(authOptions);

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="w-full max-w-xl text-center">
        <div className="text-4xl font-semibold">Anitrya</div>
        <div className="mt-3 text-white/70">
          Connect your analytics stack, sync normalized data, and turn it into action.
        </div>

        <div className="mt-8 flex items-center justify-center gap-3">
          {!session?.user ? (
            <SignInButton />
          ) : (
            <Link
              href="/home"
              className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black hover:opacity-90"
            >
              Go to App
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
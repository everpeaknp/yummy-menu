import { Loader2, LogOut, RefreshCw, UserRound } from "lucide-react";

export default function ProfileLoadError({
  error,
  busy,
  onRetry,
  onSignOut,
}: {
  error: string;
  busy: boolean;
  onRetry: () => void;
  onSignOut: () => void;
}) {
  return (
    <main className="mx-auto grid max-w-md gap-5 px-4 py-6">
      <div className="max-w-xl">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-600 text-white"><UserRound aria-hidden="true" /></span>
        <h1 className="mt-3 text-balance font-display text-2xl font-semibold tracking-tight text-stone-950">Your account is ready.</h1>
        <p className="mt-2 max-w-lg text-sm leading-7 text-stone-600">We just need to reconnect to your Yummy profile.</p>
      </div>
      <section className="rounded-[1.5rem] border border-stone-200 bg-white p-6 shadow-[0_20px_70px_rgba(28,25,23,0.09)] sm:p-8" aria-labelledby="profile-load-error-title">
        <h2 id="profile-load-error-title" className="font-display text-2xl font-semibold text-stone-950">Couldn’t open your profile</h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">{error || "Try again in a moment. If the problem continues, sign out and sign in again."}</p>
        <div className="mt-6 flex flex-col gap-3">
          <button type="button" onClick={onRetry} disabled={busy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-stone-950 px-4 font-semibold text-white hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-50">
            {busy ? <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-label="Trying again" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
            Try again
          </button>
          <button type="button" onClick={onSignOut} disabled={busy} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-stone-300 px-4 text-sm font-semibold text-stone-700 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-50">
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </section>
    </main>
  );
}

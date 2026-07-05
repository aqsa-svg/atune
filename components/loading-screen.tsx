// Calm skeleton shown while a route's data loads. Matches the app shell so the
// layout doesn't jump when real content arrives.
export function LoadingScreen() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-8 sm:px-8">
      <div className="flex flex-col gap-6 motion-safe:animate-pulse">
        <div className="h-5 w-40 rounded-full bg-secondary" />
        <div className="h-44 rounded-3xl border border-border bg-card" />
        <div className="h-28 rounded-3xl border border-border bg-card" />
        <div className="flex flex-col gap-2">
          <div className="h-14 rounded-2xl border border-border bg-card" />
          <div className="h-14 rounded-2xl border border-border bg-card" />
        </div>
      </div>
    </main>
  );
}

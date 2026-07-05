import { redirect } from "next/navigation";
import { getSessionUser, googleLoginUrl } from "@/lib/auth";
import { isOnboarded } from "@/lib/data";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { InsightCard } from "@/components/insight-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function Landing({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  const user = await getSessionUser();
  if (user) {
    redirect((await isOnboarded(user.id)) ? "/today" : "/onboarding");
  }

  const login = googleLoginUrl(next || "/today");

  return (
    <main className="min-h-full">
      <header className="mx-auto flex w-full max-w-2xl items-center justify-between px-5 py-6 sm:px-8">
        <Logo />
        <ThemeToggle />
      </header>

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-12 px-5 py-10 sm:px-8 sm:py-16">
        <section className="flex flex-col gap-6">
          <h1 className="font-display text-4xl font-semibold leading-[1.08] tracking-[-0.03em] text-balance sm:text-6xl">
            Most apps track.
            <br />
            Attune understands.
          </h1>
          <p className="max-w-md text-lg leading-relaxed text-muted-foreground">
            An AI companion that learns your daily patterns and tells you what you need — grounded in
            your own data, and never made up.
          </p>

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <a href={login} className={cn(buttonVariants(), "h-11 rounded-xl px-6 text-base")}>
                Continue with Google
              </a>
              <a
                href="/api/demo"
                className={cn(buttonVariants({ variant: "secondary" }), "h-11 rounded-xl px-6 text-base")}
              >
                Try the demo — no sign-in
              </a>
            </div>
            {error ? (
              <p className="text-sm text-destructive">Sign-in didn&rsquo;t complete. Give it another try.</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                The demo is preloaded with two weeks of sample data — see the coach and your patterns right away.
              </p>
            )}
          </div>
        </section>

        <InsightCard
          eyebrow="A glimpse"
          grounding="Every insight is tied to your own logged data — never invented."
        >
          You&rsquo;ve slept under 6 hours twice this week. On those days your{" "}
          <span className="text-haze underline decoration-haze/40 decoration-2 underline-offset-4">
            focus dips by mid-afternoon
          </span>{" "}
          — so <span className="text-apricot">tonight is the one that matters.</span>
        </InsightCard>
      </div>
    </main>
  );
}

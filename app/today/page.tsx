import { redirect } from "next/navigation";
import Link from "next/link";
import { Check } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { getTodayData } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { InsightCard } from "@/components/insight-card";
import { WeekRhythm } from "@/components/week-rhythm";
import { buttonVariants } from "@/components/ui/button";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default async function TodayPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");
  const { onboarded, habits, insight, log, doneHabitIds, week } = await getTodayData(user.id);
  if (!onboarded) redirect("/onboarding");

  const firstName = user.name?.split(" ")[0];
  const done = new Set(doneHabitIds);

  const summaryParts: string[] = [];
  if (log?.mood != null) summaryParts.push(`mood ${log.mood}`);
  if (log?.energy != null) summaryParts.push(`energy ${log.energy}`);
  if (log?.sleepHours != null) summaryParts.push(`${log.sleepHours}h sleep`);
  const summary = summaryParts.join(" · ") || "logged";

  return (
    <main className="min-h-full">
      <header className="mx-auto flex w-full max-w-2xl items-center justify-between px-5 py-6 sm:px-8">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/auth/logout"
            className="grid size-9 place-items-center rounded-full border border-border text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Sign out"
            title="Sign out"
          >
            {firstName?.[0]?.toUpperCase() ?? "•"}
          </Link>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-5 py-8 sm:px-8">
        <p className="font-display text-lg text-muted-foreground">
          {greeting()}
          {firstName ? `, ${firstName}` : ""}.
        </p>

        {insight ? (
          <InsightCard eyebrow="Today · your focus" grounding={insight.grounding}>
            {insight.body}
          </InsightCard>
        ) : (
          <InsightCard eyebrow="Today" grounding="I need a few check-ins before I can spot your patterns.">
            Let&rsquo;s get your first day on the board — check in tonight and I&rsquo;ll start learning your
            rhythm.
          </InsightCard>
        )}

        {/* check-in CTA / status */}
        {log ? (
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card px-5 py-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">Checked in today</span>
              <span className="font-mono text-xs tabular text-muted-foreground">{summary}</span>
            </div>
            <Link href="/check-in" className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}>
              Edit
            </Link>
          </div>
        ) : (
          <Link
            href="/check-in"
            className={cn(buttonVariants(), "h-12 rounded-2xl text-base")}
          >
            Check in — takes 30 seconds
          </Link>
        )}

        <div className="flex flex-col gap-3">
          <WeekRhythm week={week} />
          <Link
            href="/insights"
            className="self-start text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            See your patterns &rarr;
          </Link>
        </div>

        <section className="flex flex-col gap-4">
          <h2 className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Today&rsquo;s habits
          </h2>
          <ul className="flex flex-col gap-2">
            {habits.map((h) => {
              const isDone = done.has(h.id);
              return (
                <li
                  key={h.id}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5"
                >
                  <span className="grid size-9 place-items-center rounded-full bg-secondary text-lg">
                    {h.emoji ?? "•"}
                  </span>
                  <span className={cn("flex-1 font-medium", isDone && "text-muted-foreground line-through")}>
                    {h.name}
                  </span>
                  {isDone ? (
                    <span className="grid size-6 place-items-center rounded-full bg-primary text-primary-foreground">
                      <Check className="size-3.5" />
                    </span>
                  ) : (
                    <span className="size-6 rounded-full border-2 border-border" aria-hidden />
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </main>
  );
}

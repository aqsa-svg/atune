import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { getPatternData, detectPatterns } from "@/lib/patterns";
import { getTier } from "@/lib/subscription";
import { switchToFree } from "@/app/actions/subscription";
import { Paywall } from "@/components/paywall";
import { PatternCards } from "@/components/pattern-cards";

export default async function InsightsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");

  const tier = await getTier(user.id);
  const data = await getPatternData(user.id);
  if (!data.onboarded) redirect("/onboarding");

  const isPremium = tier === "premium";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5 py-6 sm:px-8">
      <div className="flex items-center justify-between">
        <Link
          href="/today"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Today
        </Link>
        <span className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
          {isPremium ? "Patterns" : "Premium"}
        </span>
      </div>

      <div className="py-10">
        {!isPremium ? <Paywall /> : <Patterns data={data} />}
      </div>
    </main>
  );
}

function Patterns({ data }: { data: Awaited<ReturnType<typeof getPatternData>> }) {
  const { daysLogged, enough, patterns } = detectPatterns(data);
  const remaining = Math.max(0, 7 - daysLogged);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          What I&rsquo;m seeing in your days
        </h1>
        <p className="text-muted-foreground">
          Every pattern below is computed from your own check-ins — never invented.
        </p>
      </div>

      {!enough ? (
        <div className="flex flex-col gap-5 rounded-3xl border border-border bg-card p-7">
          <p className="font-display text-xl font-medium text-balance">
            Patterns need about a week of check-ins before I&rsquo;ll call them real.
          </p>
          <div className="flex flex-col gap-2">
            <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-haze"
                style={{ width: `${Math.min(100, (daysLogged / 7) * 100)}%` }}
              />
            </div>
            <p className="font-mono text-xs tabular text-muted-foreground">
              {daysLogged} of ~7 days logged{remaining > 0 ? ` · ${remaining} to go` : ""}
            </p>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Keep your daily check-in going. The moment there&rsquo;s enough signal, this page fills with
            the things you can&rsquo;t easily see yourself.
          </p>
        </div>
      ) : patterns.length > 0 ? (
        <PatternCards patterns={patterns} />
      ) : (
        <div className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-7">
          <p className="font-display text-xl font-medium text-balance">
            Your days have been fairly steady — no strong pattern stands out yet.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            That&rsquo;s a real finding too. I&rsquo;d rather tell you nothing than invent a pattern that
            isn&rsquo;t there. I&rsquo;ll keep watching as you log more.
          </p>
        </div>
      )}

      <form action={switchToFree}>
        <button type="submit" className="text-xs text-muted-foreground/70 underline-offset-4 hover:underline">
          (test) switch back to Free
        </button>
      </form>
    </div>
  );
}

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { upgradeToPremium } from "@/app/actions/subscription";

const BENEFITS = [
  "Deep pattern insights — what actually moves your energy and mood",
  "Predictive coaching that gets ahead of your low days",
  "Unlimited history",
  "Smart, well-timed nudges",
];

export function Paywall() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <span className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
          Attune Premium
        </span>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          The patterns you can&rsquo;t see yourself.
        </h1>
        <p className="max-w-md text-muted-foreground">
          Your daily check-in and week view stay free, always. Premium is where Attune starts
          predicting what you need — grounded in your own data, never invented.
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {BENEFITS.map((b) => (
          <li key={b} className="flex items-start gap-3">
            <span
              className="mt-2 size-1.5 shrink-0 rounded-full bg-haze"
              style={{ boxShadow: "0 0 8px var(--haze)" }}
              aria-hidden
            />
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <div className="grid gap-3 sm:grid-cols-2">
        <PlanCard plan="yearly" price="$29" period="/year" note="2 months free" featured />
        <PlanCard plan="monthly" price="$3.99" period="/month" note="cancel anytime" />
      </div>

      <p className="text-xs text-muted-foreground">
        Test mode — no card required and no charge. Real Stripe checkout activates once payment keys
        are connected.
      </p>
    </div>
  );
}

function PlanCard({
  plan,
  price,
  period,
  note,
  featured = false,
}: {
  plan: string;
  price: string;
  period: string;
  note: string;
  featured?: boolean;
}) {
  return (
    <form
      action={upgradeToPremium}
      className={cn(
        "flex flex-col gap-4 rounded-3xl border bg-card p-6",
        featured ? "border-haze/50" : "border-border",
      )}
    >
      <input type="hidden" name="plan" value={plan} />
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline gap-1">
          <span className="font-display text-3xl font-semibold">{price}</span>
          <span className="text-muted-foreground">{period}</span>
        </div>
        <span className="text-xs text-muted-foreground">{note}</span>
      </div>
      <button
        type="submit"
        className={cn(
          buttonVariants({ variant: featured ? "default" : "secondary" }),
          "h-11 rounded-xl text-base",
        )}
      >
        {featured ? "Go Premium" : "Choose monthly"}
      </button>
    </form>
  );
}

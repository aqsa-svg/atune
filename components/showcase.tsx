"use client";

import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/* Static sample data — this page is a design-system preview.
   Real data arrives once check-ins are wired up. */
const WEEK = [
  { d: "M", e: 0.55, warm: false, today: false },
  { d: "T", e: 0.74, warm: false, today: false },
  { d: "W", e: 0.38, warm: true, today: false },
  { d: "T", e: 0.92, warm: false, today: false },
  { d: "F", e: 0.6, warm: true, today: true },
  { d: "S", e: 0.82, warm: false, today: false },
  { d: "S", e: 0.58, warm: false, today: false },
];

const SWATCHES = [
  { name: "Ink", cls: "bg-background" },
  { name: "Slate", cls: "bg-card" },
  { name: "Haze", cls: "bg-haze" },
  { name: "Apricot", cls: "bg-apricot" },
  { name: "Mist", cls: "bg-foreground" },
  { name: "Fog", cls: "bg-muted-foreground" },
];

export function Showcase() {
  const reduce = useReducedMotion();

  const rise = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 16, filter: "blur(6px)" },
        animate: { opacity: 1, y: 0, filter: "blur(0px)" },
        transition: {
          duration: 1,
          ease: [0.2, 0.7, 0.2, 1] as [number, number, number, number],
        },
      };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-16 px-5 py-10 sm:px-8 sm:py-16">
      {/* Signature moment — the daily insight surfacing */}
      <section className="flex flex-col gap-6">
        <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Friday · Today
        </span>

        <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-7 sm:p-10">
          <div className="attune-glow pointer-events-none absolute inset-0" aria-hidden />
          <motion.p
            {...rise}
            className="relative font-display text-2xl font-medium leading-[1.2] tracking-[-0.02em] sm:text-[2.1rem]"
          >
            You&rsquo;ve slept under 6 hours twice this week. On those days your{" "}
            <span className="text-haze underline decoration-haze/40 decoration-2 underline-offset-4">
              focus dips by mid-afternoon
            </span>{" "}
            — so <span className="text-apricot">tonight is the one that matters.</span>
          </motion.p>

          <div className="relative mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-3 py-1.5 text-[13px] text-muted-foreground">
            <span
              className="size-1.5 rounded-full bg-haze"
              style={{ boxShadow: "0 0 8px var(--haze)" }}
              aria-hidden
            />
            Grounded in 6 days of your sleep &amp; energy logs
          </div>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          One focal point per screen. The daily insight rises and settles beneath a faint
          periwinkle&#8202;&rarr;&#8202;apricot glow, and always carries a receipt of the data it
          came from. When data is thin, it says so instead of inventing a pattern.
        </p>
      </section>

      {/* Week rhythm strip */}
      <section className="flex flex-col gap-5 rounded-3xl border border-border bg-card p-7 sm:p-8">
        <span className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
          Your rhythm this week
        </span>
        <div className="flex h-28 items-end justify-between gap-2">
          {WEEK.map((n, i) => {
            const size = 18 + n.e * 26;
            const glow = 10 + n.e * 16;
            return (
              <div key={i} className="flex h-full flex-col items-center justify-end gap-3">
                <motion.span
                  initial={reduce ? undefined : { scale: 0.4, opacity: 0 }}
                  animate={reduce ? undefined : { scale: 1, opacity: 1 }}
                  transition={{ delay: 0.15 + i * 0.06, duration: 0.5, ease: "easeOut" }}
                  className="rounded-full"
                  style={{
                    width: size,
                    height: size,
                    background: `color-mix(in srgb, ${n.warm ? "var(--apricot)" : "var(--haze)"} 76%, transparent)`,
                    boxShadow: `0 0 ${glow}px color-mix(in srgb, ${n.warm ? "var(--apricot)" : "var(--haze)"} 52%, transparent)`,
                    outline: n.today ? "2px solid var(--foreground)" : "none",
                    outlineOffset: 4,
                  }}
                />
                <span
                  className={`font-mono text-[11px] ${n.today ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {n.d}
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Not bars &mdash; soft nodes whose size and glow encode energy. Warm nodes flag the low
          days worth noticing. Quiet by design, so the daily insight stays the hero.
        </p>
      </section>

      {/* System reference — palette + primitives + type */}
      <section className="flex flex-col gap-6">
        <span className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
          Twilight system
        </span>

        <div className="flex flex-wrap gap-2">
          {SWATCHES.map((s) => (
            <div key={s.name} className="flex items-center gap-2 rounded-full border border-border py-1 pl-1 pr-3">
              <span className={`size-6 rounded-full border border-border/60 ${s.cls}`} />
              <span className="text-[13px] text-muted-foreground">{s.name}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button>Start tonight&rsquo;s check-in</Button>
          <Button variant="secondary">Later</Button>
          <Button variant="ghost">Skip</Button>
          <Badge>Premium</Badge>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="font-display text-xl font-semibold">Bricolage Grotesque</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Display &mdash; carries the personality at large sizes.
          </p>
          <p className="mt-4 text-base">
            General Sans keeps the body text quiet, legible, and calm &mdash; letting the display
            face lead.
          </p>
        </div>
      </section>
    </div>
  );
}

"use client";

import { motion, useReducedMotion } from "motion/react";
import type { PatternViz } from "@/lib/patterns";

// Charts for the Insights page. Each one draws only the real averages carried
// in the pattern's `viz` payload — the visual echo of "grounded in your data."
// Energy lives on a 1–5 scale, so bars are measured against that ceiling
// (honest magnitude, not stretched to fill).
const SCALE_MAX = 5;

export function PatternChart({ viz }: { viz: PatternViz }) {
  if (viz.kind === "weekday") return <WeekdayChart viz={viz} />;
  if (viz.kind === "compare") return <CompareChart viz={viz} />;
  return <TrendChart viz={viz} />;
}

/* ── Weekday bars: energy per day of week, the notable day lit up ────────── */
function WeekdayChart({ viz }: { viz: Extract<PatternViz, { kind: "weekday" }> }) {
  const reduce = useReducedMotion();
  const label = `Average energy by weekday; ${viz.highlight} stands out at ${
    viz.bars.find((b) => b.label === viz.highlight)?.value ?? ""
  } versus ${viz.overall} overall.`;

  return (
    <figure role="img" aria-label={label} className="relative flex h-28 items-end gap-1.5 sm:gap-2">
      {/* overall baseline */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 border-t border-dashed border-muted-foreground/35"
        style={{ bottom: `${(viz.overall / SCALE_MAX) * 100}%` }}
      />
      {viz.bars.map((b, i) => {
        const on = b.label === viz.highlight;
        return (
          <div key={b.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
            {on ? <span className="font-mono text-[11px] tabular text-apricot">{b.value}</span> : null}
            <motion.div
              initial={reduce ? undefined : { scaleY: 0 }}
              whileInView={reduce ? undefined : { scaleY: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.05 * i, duration: 0.5, ease: "easeOut" }}
              className="w-full origin-bottom rounded-t-md"
              style={{
                height: `${(b.value / SCALE_MAX) * 100}%`,
                background: on
                  ? "var(--apricot)"
                  : "color-mix(in srgb, var(--haze) 30%, transparent)",
                boxShadow: on ? "0 0 14px color-mix(in srgb, var(--apricot) 45%, transparent)" : "none",
              }}
            />
            <span
              className={`font-mono text-[10px] ${on ? "text-foreground" : "text-muted-foreground/70"}`}
            >
              {b.label}
            </span>
          </div>
        );
      })}
    </figure>
  );
}

/* ── Compare: two groups side by side, the stronger one lit ──────────────── */
function CompareChart({ viz }: { viz: Extract<PatternViz, { kind: "compare" }> }) {
  const reduce = useReducedMotion();
  const hero = viz.bars.reduce((m, b) => (b.value > m.value ? b : m), viz.bars[0]);
  const label = `${viz.unit}: ${viz.bars.map((b) => `${b.label} ${b.value}`).join(", ")}.`;

  return (
    <figure role="img" aria-label={label} className="flex flex-col gap-3">
      {viz.bars.map((b, i) => {
        const on = b.label === hero.label;
        return (
          <div key={b.label} className="flex items-center gap-3">
            <div className="w-24 shrink-0 text-right text-xs text-muted-foreground">{b.label}</div>
            <div className="relative h-7 flex-1 overflow-hidden rounded-md bg-secondary/50">
              <motion.div
                initial={reduce ? undefined : { scaleX: 0 }}
                whileInView={reduce ? undefined : { scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.08 * i, duration: 0.55, ease: "easeOut" }}
                className="absolute inset-y-0 left-0 origin-left rounded-md"
                style={{
                  width: `${(b.value / SCALE_MAX) * 100}%`,
                  background: on
                    ? "var(--haze)"
                    : "color-mix(in srgb, var(--haze) 28%, transparent)",
                }}
              />
              <span
                className={`absolute inset-y-0 right-2 flex items-center font-mono text-[11px] tabular ${
                  on ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {b.value.toFixed(1)}
              </span>
            </div>
            <div className="w-10 shrink-0 font-mono text-[10px] tabular text-muted-foreground/60">
              {b.n}d
            </div>
          </div>
        );
      })}
      <figcaption className="pl-[6.75rem] font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60">
        {viz.unit}
      </figcaption>
    </figure>
  );
}

/* ── Trend: an energy sparkline with an emphasized last point ────────────── */
function TrendChart({ viz }: { viz: Extract<PatternViz, { kind: "trend" }> }) {
  const reduce = useReducedMotion();
  const W = 300;
  const H = 88;
  const pad = 8;
  const pts = viz.points;
  const n = pts.length;
  const x = (i: number) => pad + (i / Math.max(1, n - 1)) * (W - pad * 2);
  const y = (v: number) => H - pad - ((v - 1) / (SCALE_MAX - 1)) * (H - pad * 2); // 1–5 → bottom→top
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");
  const area = `${line} L ${x(n - 1).toFixed(1)} ${H - pad} L ${x(0).toFixed(1)} ${H - pad} Z`;
  const last = pts[n - 1];
  const label = `Energy over ${n} days, from ${pts[0]?.value} to ${last?.value}.`;

  return (
    <figure role="img" aria-label={label} className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-24 w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="trendfill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--haze)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--haze)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path
          d={area}
          fill="url(#trendfill)"
          initial={reduce ? undefined : { opacity: 0 }}
          whileInView={reduce ? undefined : { opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        />
        <motion.path
          d={line}
          fill="none"
          stroke="var(--haze)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          initial={reduce ? undefined : { pathLength: 0 }}
          whileInView={reduce ? undefined : { pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
        <circle cx={x(n - 1)} cy={y(last.value)} r={4} fill="var(--haze)" />
        <circle cx={x(n - 1)} cy={y(last.value)} r={8} fill="var(--haze)" opacity={0.25} />
      </svg>
      <figcaption className="mt-1 flex justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60">
        <span>{n} days ago</span>
        <span>today</span>
      </figcaption>
    </figure>
  );
}

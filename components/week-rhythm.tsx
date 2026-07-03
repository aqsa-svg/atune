"use client";

import { motion, useReducedMotion } from "motion/react";
import type { WeekDay } from "@/lib/data";

/** The signature-adjacent, deliberately quiet week view: soft nodes whose size
 *  and glow track energy. Days without a check-in are dashed placeholders. */
export function WeekRhythm({ week }: { week: WeekDay[] }) {
  const reduce = useReducedMotion();
  const hasAny = week.some((d) => d.energy != null);

  return (
    <section className="flex flex-col gap-5 rounded-3xl border border-border bg-card p-6 sm:p-7">
      <h2 className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
        Your rhythm this week
      </h2>

      <div className="flex h-24 items-end justify-between gap-2">
        {week.map((d, i) => {
          const has = d.energy != null;
          const e = d.energy ?? 0;
          const size = has ? 16 + (e / 5) * 26 : 12;
          const glow = has ? 8 + (e / 5) * 16 : 0;
          const warm = has && d.mood != null && d.mood <= 2;
          const color = warm ? "var(--apricot)" : "var(--haze)";
          return (
            <div key={d.day} className="flex h-full flex-col items-center justify-end gap-3">
              <motion.span
                initial={reduce ? undefined : { scale: 0.4, opacity: 0 }}
                animate={reduce ? undefined : { scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 + i * 0.05, duration: 0.5, ease: "easeOut" }}
                className="rounded-full"
                style={{
                  width: size,
                  height: size,
                  background: has ? `color-mix(in srgb, ${color} 76%, transparent)` : "transparent",
                  border: has
                    ? "none"
                    : "1.5px dashed color-mix(in srgb, var(--muted-foreground) 45%, transparent)",
                  boxShadow: has ? `0 0 ${glow}px color-mix(in srgb, ${color} 52%, transparent)` : "none",
                  outline: d.isToday ? "2px solid var(--foreground)" : "none",
                  outlineOffset: 4,
                }}
              />
              <span
                className={`font-mono text-[11px] ${d.isToday ? "text-foreground" : "text-muted-foreground"}`}
              >
                {d.dow[0]}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        {hasAny
          ? "Node size and glow track your energy — warm nodes mark low-mood days."
          : "This fills in as you check in each day."}
      </p>
    </section>
  );
}

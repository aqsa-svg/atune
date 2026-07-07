"use client";

import { motion, useReducedMotion } from "motion/react";
import type { Pattern } from "@/lib/patterns";
import { PatternChart } from "@/components/pattern-viz";

/** The detected patterns, each card rising in with a gentle stagger. */
export function PatternCards({ patterns }: { patterns: Pattern[] }) {
  const reduce = useReducedMotion();
  return (
    <div className="flex flex-col gap-3">
      {patterns.map((p, i) => (
        <motion.div
          key={i}
          initial={reduce ? undefined : { opacity: 0, y: 14 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          transition={{ delay: 0.08 + i * 0.09, duration: 0.5, ease: "easeOut" }}
          className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-7"
        >
          <h2 className="font-display text-xl font-semibold tracking-tight text-balance sm:text-2xl">
            {p.title}
          </h2>
          <p className="leading-relaxed text-muted-foreground">{p.detail}</p>
          {p.viz ? (
            <div className="py-1">
              <PatternChart viz={p.viz} />
            </div>
          ) : null}
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-secondary/60 px-3 py-1.5 text-[12.5px] text-muted-foreground">
            <span
              className="size-1.5 shrink-0 rounded-full bg-haze"
              style={{ boxShadow: "0 0 8px var(--haze)" }}
              aria-hidden
            />
            {p.grounding}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

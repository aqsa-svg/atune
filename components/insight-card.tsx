"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

/** The signature moment: one focal insight that rises and settles under a
 *  periwinkle→apricot glow, always with a receipt of the data behind it. */
export function InsightCard({
  eyebrow,
  grounding,
  animate = true,
  children,
}: {
  eyebrow?: string;
  grounding?: string | null;
  animate?: boolean;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  const rise =
    !animate || reduce
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
    <div className="flex flex-col gap-4">
      {eyebrow ? (
        <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
          {eyebrow}
        </span>
      ) : null}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-7 sm:p-10">
        <div className="attune-glow pointer-events-none absolute inset-0" aria-hidden />
        <motion.div
          {...rise}
          className="relative font-display text-2xl font-medium leading-[1.22] tracking-[-0.02em] text-balance sm:text-[2rem]"
        >
          {children}
        </motion.div>
        {grounding ? (
          <div className="relative mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-3 py-1.5 text-[13px] text-muted-foreground">
            <span
              className="size-1.5 shrink-0 rounded-full bg-haze"
              style={{ boxShadow: "0 0 8px var(--haze)" }}
              aria-hidden
            />
            {grounding}
          </div>
        ) : null}
      </div>
    </div>
  );
}

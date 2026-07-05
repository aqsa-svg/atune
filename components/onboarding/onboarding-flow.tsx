"use client";

import { useState, useTransition, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { GOALS, LOW_PERIODS } from "@/lib/options";
import { HabitPicker } from "@/components/habit-picker";
import { completeOnboarding } from "@/app/actions/onboarding";

type Habit = { name: string; emoji: string };
const TOTAL = 6; // intro, rhythm, goals, dips, habits, finish

export function OnboardingFlow({ name }: { name: string | null }) {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [wakeTime, setWakeTime] = useState("07:00");
  const [sleepTime, setSleepTime] = useState("23:00");
  const [goals, setGoals] = useState<string[]>([]);
  const [lowPeriods, setLowPeriods] = useState<string[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [pending, startTransition] = useTransition();

  const toggleStr = (list: string[], set: (v: string[]) => void, value: string) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const canContinue =
    step === 1 ? Boolean(wakeTime && sleepTime) : step === 2 ? goals.length > 0 : step === 4 ? habits.length > 0 : true;

  const firstName = name?.split(" ")[0];

  function finish() {
    startTransition(async () => {
      await completeOnboarding({ wakeTime, sleepTime, goals, lowPeriods, habits });
    });
  }

  const variants = reduce
    ? { initial: {}, animate: {}, exit: {} }
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -8 },
      };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-6 py-10">
      {/* progress */}
      <div className="flex items-center gap-3">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-secondary">
          <motion.div
            className="h-full rounded-full bg-haze"
            animate={{ width: `${(step / (TOTAL - 1)) * 100}%` }}
            transition={{ duration: reduce ? 0 : 0.4, ease: "easeOut" }}
          />
        </div>
        <span className="font-mono text-xs tabular text-muted-foreground">
          {step === 0 ? "start" : `${step}/${TOTAL - 1}`}
        </span>
      </div>

      <div className="flex flex-1 flex-col justify-center py-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: reduce ? 0 : 0.35, ease: "easeOut" }}
            className="flex flex-col gap-7"
          >
            {step === 0 && (
              <Step title={`Let's attune to you${firstName ? `, ${firstName}` : ""}.`}>
                <p className="text-muted-foreground">
                  A few quiet questions — under a minute. Just enough for a first suggestion made for
                  you tonight, before any data exists.
                </p>
              </Step>
            )}

            {step === 1 && (
              <Step title="When does your day usually begin and end?">
                <div className="flex flex-col gap-4">
                  <TimeField label="I usually wake around" value={wakeTime} onChange={setWakeTime} />
                  <TimeField label="I usually sleep around" value={sleepTime} onChange={setSleepTime} />
                </div>
              </Step>
            )}

            {step === 2 && (
              <Step title="What do you most want to feel?" hint="Pick anything that resonates.">
                <div className="flex flex-wrap gap-2.5">
                  {GOALS.map((g) => (
                    <Chip key={g.slug} on={goals.includes(g.slug)} onClick={() => toggleStr(goals, setGoals, g.slug)}>
                      {g.label}
                    </Chip>
                  ))}
                </div>
              </Step>
            )}

            {step === 3 && (
              <Step title="When do you tend to dip?" hint="This tells me where to look first. Optional.">
                <div className="flex flex-wrap gap-2.5">
                  {LOW_PERIODS.map((l) => (
                    <Chip
                      key={l.slug}
                      on={lowPeriods.includes(l.slug)}
                      onClick={() => toggleStr(lowPeriods, setLowPeriods, l.slug)}
                    >
                      {l.label}
                    </Chip>
                  ))}
                </div>
              </Step>
            )}

            {step === 4 && (
              <Step title="Pick 2–3 habits that matter to you." hint="Add your own if you don't see it.">
                <HabitPicker value={habits} onChange={setHabits} />
              </Step>
            )}

            {step === 5 && (
              <Step title="That's all I need." hint="Your first suggestion is ready.">
                <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                  <SummaryRow k="Rhythm" v={`${wakeTime} – ${sleepTime}`} />
                  <SummaryRow k="Focus" v={goals.map((g) => GOALS.find((x) => x.slug === g)?.label).join(", ") || "—"} />
                  <SummaryRow k="Habits" v={habits.map((h) => `${h.emoji} ${h.name}`).join("  ") || "—"} />
                </ul>
              </Step>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* nav */}
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className={step === 0 ? "pointer-events-none opacity-0" : ""}
        >
          Back
        </Button>
        {step < TOTAL - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canContinue}>
            {step === 0 ? "Begin" : "Continue"}
          </Button>
        ) : (
          <Button onClick={finish} disabled={pending}>
            {pending ? "Attuning…" : "See tonight's suggestion"}
          </Button>
        )}
      </div>
    </main>
  );
}

function Step({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight text-balance sm:text-4xl">
          {title}
        </h1>
        {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`rounded-full border px-4 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        on
          ? "border-transparent bg-primary text-primary-foreground"
          : "border-border text-foreground hover:bg-secondary"
      }`}
    >
      {children}
    </button>
  );
}

function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card px-5 py-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent font-display text-xl font-medium tabular focus:outline-none"
      />
    </label>
  );
}

function SummaryRow({ k, v }: { k: string; v: string }) {
  return (
    <li className="flex gap-3">
      <span className="w-16 shrink-0 font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground/70">
        {k}
      </span>
      <span className="text-foreground">{v}</span>
    </li>
  );
}

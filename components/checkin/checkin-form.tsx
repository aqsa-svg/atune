"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { submitCheckin } from "@/app/actions/checkin";
import { parseDayText } from "@/lib/parse";
import type { Habit, DailyLog } from "@/lib/data";

const MOOD_LABELS = ["rough", "great"] as const;
const ENERGY_LABELS = ["drained", "wired"] as const;
const SLEEP_OPTS = [
  { label: "<5", v: 4.5 },
  { label: "5", v: 5 },
  { label: "6", v: 6 },
  { label: "7", v: 7 },
  { label: "8", v: 8 },
  { label: "9+", v: 9 },
];

export function CheckinForm({
  habits,
  initial,
  doneHabitIds,
}: {
  habits: Habit[];
  initial: DailyLog | null;
  doneHabitIds: number[];
}) {
  const [note, setNote] = useState(initial?.note ?? "");
  const [mood, setMood] = useState<number | null>(initial?.mood ?? null);
  const [energy, setEnergy] = useState<number | null>(initial?.energy ?? null);
  const [sleepHours, setSleepHours] = useState<number | null>(initial?.sleepHours ?? null);
  const [done, setDone] = useState<Set<number>>(new Set(doneHabitIds));
  const [filled, setFilled] = useState(false);
  const [pending, startTransition] = useTransition();

  const editing = initial !== null;

  function toggleHabit(id: number) {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function quickFill() {
    const p = parseDayText(note, habits);
    if (p.mood) setMood(p.mood);
    if (p.energy) setEnergy(p.energy);
    if (p.sleepHours) setSleepHours(p.sleepHours);
    if (p.doneHabitIds || p.undoneHabitIds) {
      setDone((prev) => {
        const next = new Set(prev);
        p.doneHabitIds?.forEach((id) => next.add(id));
        p.undoneHabitIds?.forEach((id) => next.delete(id));
        return next;
      });
    }
    setFilled(true);
  }

  function save() {
    startTransition(async () => {
      await submitCheckin({
        mood,
        energy,
        sleepHours,
        note: note.trim() || null,
        doneHabitIds: Array.from(done),
      });
    });
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-6 py-8">
      <div className="flex items-center justify-between">
        <Link
          href="/today"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Today
        </Link>
        <span className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
          {editing ? "Edit check-in" : "Check-in"}
        </span>
      </div>

      <div className="flex flex-col gap-9 py-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight">How was today?</h1>

        {/* conversational quick-fill (doubles as the note) */}
        <div className="flex flex-col gap-2.5">
          <textarea
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setFilled(false);
            }}
            rows={2}
            placeholder="In a few words… e.g. “slept badly, skipped the gym, felt stressed”"
            className="w-full resize-none rounded-2xl border border-border bg-card px-4 py-3.5 text-base outline-none placeholder:text-muted-foreground/60 focus:border-ring focus:ring-2 focus:ring-ring/40"
          />
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={quickFill} disabled={!note.trim()}>
              <Sparkles className="size-3.5" />
              Quick-fill from your words
            </Button>
            {filled ? (
              <span className="text-xs text-muted-foreground">Filled below — adjust anything.</span>
            ) : null}
          </div>
        </div>

        {/* habits */}
        {habits.length > 0 ? (
          <Section label="What did you keep today?">
            <div className="flex flex-wrap gap-2.5">
              {habits.map((h) => {
                const on = done.has(h.id);
                return (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => toggleHabit(h.id)}
                    aria-pressed={on}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      on
                        ? "border-transparent bg-primary text-primary-foreground"
                        : "border-border text-foreground hover:bg-secondary",
                    )}
                  >
                    <span>{h.emoji ?? "•"}</span>
                    {h.name}
                  </button>
                );
              })}
              <Link
                href="/settings"
                className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Plus className="size-3.5" />
                Add your own
              </Link>
            </div>
          </Section>
        ) : null}

        {/* mood + energy */}
        <Section label="Mood">
          <Scale value={mood} onChange={setMood} ends={MOOD_LABELS} />
        </Section>
        <Section label="Energy">
          <Scale value={energy} onChange={setEnergy} ends={ENERGY_LABELS} />
        </Section>

        {/* sleep */}
        <Section label="Hours of sleep" hint="optional">
          <div className="flex flex-wrap gap-2">
            {SLEEP_OPTS.map((o) => (
              <button
                key={o.label}
                type="button"
                onClick={() => setSleepHours(sleepHours === o.v ? null : o.v)}
                className={cn(
                  "min-w-11 rounded-xl border px-3 py-2 text-sm tabular transition-colors",
                  sleepHours === o.v
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "border-border text-foreground hover:bg-secondary",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </Section>
      </div>

      <div className="mt-auto pt-2">
        <Button onClick={save} disabled={pending} className="h-11 w-full rounded-xl text-base">
          {pending ? "Reading your day…" : editing ? "Update check-in" : "Save check-in"}
        </Button>
      </div>
    </main>
  );
}

function Section({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline gap-2">
        <h2 className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</h2>
        {hint ? <span className="text-xs text-muted-foreground/50">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

function Scale({
  value,
  onChange,
  ends,
}: {
  value: number | null;
  onChange: (v: number) => void;
  ends: readonly [string, string];
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-label={`${n} of 5`}
            className={cn(
              "h-11 flex-1 rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              value === n
                ? "border-transparent bg-primary text-primary-foreground"
                : "border-border hover:bg-secondary",
            )}
          >
            <span className="text-sm tabular">{n}</span>
          </button>
        ))}
      </div>
      <div className="flex justify-between px-1 text-xs text-muted-foreground/60">
        <span>{ends[0]}</span>
        <span>{ends[1]}</span>
      </div>
    </div>
  );
}

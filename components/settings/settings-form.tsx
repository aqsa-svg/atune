"use client";

import { useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { GOALS, LOW_PERIODS } from "@/lib/options";
import { HabitPicker } from "@/components/habit-picker";
import { saveSettings } from "@/app/actions/settings";
import type { Profile, Habit } from "@/lib/data";

type H = { name: string; emoji: string };

export function SettingsForm({ profile, habits }: { profile: Profile; habits: Habit[] }) {
  const [wakeTime, setWakeTime] = useState(profile.wake_time ?? "07:00");
  const [sleepTime, setSleepTime] = useState(profile.sleep_time ?? "23:00");
  const [goals, setGoals] = useState<string[]>(profile.goals);
  const [lowPeriods, setLowPeriods] = useState<string[]>(profile.low_periods);
  const [selected, setSelected] = useState<H[]>(
    habits.map((h) => ({ name: h.name, emoji: h.emoji ?? "•" })),
  );
  const [pending, startTransition] = useTransition();

  const toggleStr = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const canSave = goals.length > 0 && selected.length > 0 && !pending;

  function save() {
    startTransition(async () => {
      await saveSettings({ wakeTime, sleepTime, goals, lowPeriods, habits: selected });
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
        <span className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">Settings</span>
      </div>

      <div className="flex flex-col gap-9 py-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Adjust what Attune tracks</h1>

        <Section label="Your rhythm">
          <div className="flex flex-col gap-3">
            <TimeField label="I usually wake around" value={wakeTime} onChange={setWakeTime} />
            <TimeField label="I usually sleep around" value={sleepTime} onChange={setSleepTime} />
          </div>
        </Section>

        <Section label="What you want to feel">
          <div className="flex flex-wrap gap-2.5">
            {GOALS.map((g) => (
              <Chip key={g.slug} on={goals.includes(g.slug)} onClick={() => toggleStr(goals, setGoals, g.slug)}>
                {g.label}
              </Chip>
            ))}
          </div>
        </Section>

        <Section label="When you tend to dip">
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
        </Section>

        <Section label="Your habits" hint="removing one keeps its past history">
          <HabitPicker value={selected} onChange={setSelected} />
        </Section>
      </div>

      <div className="mt-auto pt-2">
        <Button onClick={save} disabled={!canSave} className="h-11 w-full rounded-xl text-base">
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </main>
  );
}

function Section({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
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

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "rounded-full border px-4 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        on ? "border-transparent bg-primary text-primary-foreground" : "border-border text-foreground hover:bg-secondary",
      )}
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

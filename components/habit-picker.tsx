"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { HABIT_SUGGESTIONS } from "@/lib/options";

export type PickedHabit = { name: string; emoji: string };

/** Habit chooser: preset suggestions + a "add your own" input. Custom habits
 *  render as selected chips alongside the presets. Used in onboarding & settings. */
export function HabitPicker({
  value,
  onChange,
}: {
  value: PickedHabit[];
  onChange: (v: PickedHabit[]) => void;
}) {
  const [custom, setCustom] = useState("");

  const options: PickedHabit[] = [
    ...HABIT_SUGGESTIONS.map((h) => ({ name: h.name, emoji: h.emoji })),
    ...value.filter((v) => !HABIT_SUGGESTIONS.some((h) => h.name === v.name)),
  ];

  const isOn = (name: string) => value.some((v) => v.name.toLowerCase() === name.toLowerCase());

  const toggle = (h: PickedHabit) =>
    onChange(
      isOn(h.name)
        ? value.filter((v) => v.name.toLowerCase() !== h.name.toLowerCase())
        : [...value, h],
    );

  function addCustom() {
    const name = custom.trim();
    if (!name || isOn(name)) {
      setCustom("");
      return;
    }
    onChange([...value, { name, emoji: "🌱" }]);
    setCustom("");
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2.5">
        {options.map((h) => (
          <button
            key={h.name}
            type="button"
            aria-pressed={isOn(h.name)}
            onClick={() => toggle(h)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isOn(h.name)
                ? "border-transparent bg-primary text-primary-foreground"
                : "border-border text-foreground hover:bg-secondary",
            )}
          >
            <span className="mr-1.5">{h.emoji}</span>
            {h.name}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
          maxLength={40}
          placeholder="add your own…"
          className="min-w-0 flex-1 rounded-full border border-border bg-card px-4 py-2 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-ring focus:ring-2 focus:ring-ring/40"
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={!custom.trim()}
          aria-label="Add habit"
          className="inline-flex items-center gap-1 rounded-full border border-border px-3.5 py-2 text-sm transition-colors hover:bg-secondary disabled:pointer-events-none disabled:opacity-40"
        >
          <Plus className="size-4" />
          Add
        </button>
      </div>
    </div>
  );
}

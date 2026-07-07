import { sqlBatch } from "./db";

type LogRow = {
  day: string;
  dowFull: string; // "Monday"
  mood: number | null;
  energy: number | null;
  sleep: number | null;
};

export type PatternData = {
  onboarded: boolean;
  logs: LogRow[];
  habits: { id: number; name: string }[];
  dayHabits: Map<string, Set<number>>;
};

// Small, self-describing datasets the UI renders as inline charts. Every number
// here is a real average computed from the user's own logs — nothing invented.
export type PatternViz =
  | { kind: "weekday"; overall: number; highlight: string; bars: { label: string; value: number }[] }
  | { kind: "compare"; unit: string; bars: { label: string; value: number; n: number }[] }
  | { kind: "trend"; points: { day: string; value: number }[] };

export type Pattern = { title: string; detail: string; grounding: string; viz?: PatternViz };
export type PatternResult = { daysLogged: number; enough: boolean; patterns: Pattern[] };

const MIN_DAYS = 7; // "after ~7 days" per the spec
const MIN_GROUP = 3; // samples needed on each side of a comparison
const MIN_EFFECT = 0.6; // meaningful gap on the 1–5 scale
const TREND_MIN = 14; // a trend needs a couple of weeks to mean anything
const TREND_EFFECT = 0.7;

const DOW_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const short = (d: string) => d.slice(0, 3);
const avg = (n: number[]) => n.reduce((a, b) => a + b, 0) / n.length;
const r1 = (n: number) => Math.round(n * 10) / 10;

/** Next calendar day as YYYY-MM-DD (UTC), for lag correlations. */
function nextDay(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export async function getPatternData(userId: number): Promise<PatternData> {
  const [u, l, hl, h] = await sqlBatch([
    { query: `SELECT onboarded_at FROM app_user WHERE id = $1`, params: [userId] },
    {
      query: `SELECT to_char(log_date, 'YYYY-MM-DD') AS day,
                     trim(to_char(log_date, 'Day')) AS dow_full,
                     mood, energy, sleep_hours
              FROM daily_log
              WHERE user_id = $1 AND log_date >= CURRENT_DATE - 59
              ORDER BY log_date`,
      params: [userId],
    },
    {
      query: `SELECT to_char(log_date, 'YYYY-MM-DD') AS day, habit_id
              FROM habit_log
              WHERE user_id = $1 AND done = TRUE AND log_date >= CURRENT_DATE - 59`,
      params: [userId],
    },
    { query: `SELECT id, name FROM habit WHERE user_id = $1 AND archived = FALSE ORDER BY sort, id`, params: [userId] },
  ]);

  const logs: LogRow[] = ((l?.rows ?? []) as Record<string, unknown>[]).map((r) => ({
    day: String(r.day),
    dowFull: String(r.dow_full),
    mood: r.mood != null ? Number(r.mood) : null,
    energy: r.energy != null ? Number(r.energy) : null,
    sleep: r.sleep_hours != null ? Number(r.sleep_hours) : null,
  }));

  const dayHabits = new Map<string, Set<number>>();
  for (const r of (hl?.rows ?? []) as { day: string; habit_id: number | string }[]) {
    const key = String(r.day);
    if (!dayHabits.has(key)) dayHabits.set(key, new Set());
    dayHabits.get(key)!.add(Number(r.habit_id));
  }

  return {
    onboarded: Boolean((u?.rows[0] as { onboarded_at?: string | null } | undefined)?.onboarded_at),
    logs,
    habits: ((h?.rows ?? []) as { id: number | string; name: string }[]).map((r) => ({
      id: Number(r.id),
      name: String(r.name),
    })),
    dayHabits,
  };
}

type EnergyLog = LogRow & { energy: number };
type SleepLog = EnergyLog & { sleep: number };

/** Every pattern is a real computed comparison over the user's own logs. */
export function detectPatterns(data: PatternData): PatternResult {
  const daysLogged = data.logs.length;
  if (daysLogged < MIN_DAYS) return { daysLogged, enough: false, patterns: [] };

  const scored: (Pattern & { effect: number })[] = [];
  const withE = data.logs.filter((l): l is EnergyLog => l.energy != null);
  const withS = withE.filter((l): l is SleepLog => l.sleep != null);

  // 1. Day of week — surface the single strongest deviation (a dip or a peak),
  //    never both, so we don't show two near-identical weekday charts.
  if (withE.length >= MIN_DAYS) {
    const overall = avg(withE.map((l) => l.energy));
    const byDow = new Map<string, number[]>();
    for (const l of withE) {
      if (!byDow.has(l.dowFull)) byDow.set(l.dowFull, []);
      byDow.get(l.dowFull)!.push(l.energy);
    }
    const present = DOW_ORDER.filter((d) => (byDow.get(d)?.length ?? 0) >= 2);
    if (present.length >= 2) {
      const bars = present.map((d) => ({ label: short(d), value: r1(avg(byDow.get(d)!)) }));
      let dip: { dow: string; a: number; n: number } | null = null;
      let peak: { dow: string; a: number; n: number } | null = null;
      for (const d of present) {
        const arr = byDow.get(d)!;
        const a = avg(arr);
        if (!dip || a < dip.a) dip = { dow: d, a, n: arr.length };
        if (!peak || a > peak.a) peak = { dow: d, a, n: arr.length };
      }
      const dipEff = dip ? overall - dip.a : 0;
      const peakEff = peak ? peak.a - overall : 0;
      if (dip && dipEff >= peakEff && dipEff >= MIN_EFFECT) {
        scored.push({
          title: `Your energy dips on ${dip.dow}s`,
          detail: `On average, your energy runs lower on ${dip.dow}s than across the rest of your week.`,
          grounding: `avg energy ${r1(dip.a)} on ${dip.dow}s vs ${r1(overall)} overall · ${dip.n} ${dip.dow}s logged`,
          effect: dipEff,
          viz: { kind: "weekday", overall: r1(overall), highlight: short(dip.dow), bars },
        });
      } else if (peak && peakEff >= MIN_EFFECT) {
        scored.push({
          title: `Your energy peaks on ${peak.dow}s`,
          detail: `${peak.dow}s are consistently your strongest day of the week.`,
          grounding: `avg energy ${r1(peak.a)} on ${peak.dow}s vs ${r1(overall)} overall · ${peak.n} ${peak.dow}s logged`,
          effect: peakEff,
          viz: { kind: "weekday", overall: r1(overall), highlight: short(peak.dow), bars },
        });
      }
    }
  }

  // 2. Habit → energy
  for (const habit of data.habits) {
    const done: number[] = [];
    const skipped: number[] = [];
    for (const l of withE) {
      (data.dayHabits.get(l.day)?.has(habit.id) ? done : skipped).push(l.energy);
    }
    if (done.length < MIN_GROUP || skipped.length < MIN_GROUP) continue;
    const da = avg(done);
    const sa = avg(skipped);
    if (da - sa >= MIN_EFFECT) {
      scored.push({
        title: `Your energy is higher on days you ${habit.name.toLowerCase()}`,
        detail: `Days you keep “${habit.name}” tend to bring more energy than days you skip it.`,
        grounding: `avg energy ${r1(da)} on ${habit.name} days vs ${r1(sa)} without · ${done.length} vs ${skipped.length} days`,
        effect: da - sa,
        viz: {
          kind: "compare",
          unit: "avg energy",
          bars: [
            { label: `${habit.name} days`, value: r1(da), n: done.length },
            { label: "Other days", value: r1(sa), n: skipped.length },
          ],
        },
      });
    }
  }

  // 3. Sleep → same-day energy
  if (withS.length >= 6) {
    const good = withS.filter((l) => l.sleep >= 7).map((l) => l.energy);
    const poor = withS.filter((l) => l.sleep < 7).map((l) => l.energy);
    if (good.length >= MIN_GROUP && poor.length >= MIN_GROUP) {
      const ga = avg(good);
      const pa = avg(poor);
      if (ga - pa >= MIN_EFFECT) {
        scored.push({
          title: `You have more energy after 7+ hours of sleep`,
          detail: `Nights of 7 hours or more track with higher energy that same day.`,
          grounding: `avg energy ${r1(ga)} on 7h+ nights vs ${r1(pa)} on shorter · ${good.length} vs ${poor.length} days`,
          effect: ga - pa,
          viz: {
            kind: "compare",
            unit: "avg energy",
            bars: [
              { label: "7h+ sleep", value: r1(ga), n: good.length },
              { label: "Under 7h", value: r1(pa), n: poor.length },
            ],
          },
        });
      }
    }
  }

  // 4. Sleep → NEXT-day energy (a lag effect that's easy to miss). Only
  //    surfaced when more sleep genuinely helps the following day.
  {
    const eByDay = new Map<string, number>();
    for (const l of withE) eByDay.set(l.day, l.energy);
    const goodNext: number[] = [];
    const poorNext: number[] = [];
    for (const l of withS) {
      const ne = eByDay.get(nextDay(l.day));
      if (ne == null) continue;
      (l.sleep >= 7 ? goodNext : poorNext).push(ne);
    }
    if (goodNext.length >= MIN_GROUP && poorNext.length >= MIN_GROUP) {
      const ga = avg(goodNext);
      const pa = avg(poorNext);
      if (ga - pa >= MIN_EFFECT) {
        scored.push({
          title: `A good night lifts your energy the next day`,
          detail: `After nights of 7+ hours, your energy the following day runs higher — a knock-on effect that's easy to miss.`,
          grounding: `next-day energy ${r1(ga)} after 7h+ nights vs ${r1(pa)} after shorter · ${goodNext.length} vs ${poorNext.length} days`,
          effect: ga - pa,
          viz: {
            kind: "compare",
            unit: "next-day energy",
            bars: [
              { label: "After 7h+", value: r1(ga), n: goodNext.length },
              { label: "After <7h", value: r1(pa), n: poorNext.length },
            ],
          },
        });
      }
    }
  }

  // 5. Energy trend over the window (needs a couple of weeks of signal).
  if (withE.length >= TREND_MIN) {
    const vals = withE.map((l) => l.energy); // logs arrive chronological
    const third = Math.max(1, Math.floor(vals.length / 3));
    const first = avg(vals.slice(0, third));
    const last = avg(vals.slice(-third));
    const diff = last - first;
    if (Math.abs(diff) >= TREND_EFFECT) {
      const up = diff > 0;
      scored.push({
        title: up ? `Your energy is trending up` : `Your energy has been sliding`,
        detail: up
          ? `Across your recent check-ins your energy has been climbing — something lately is working.`
          : `Across your recent check-ins your energy has drifted lower. Worth a gentle look at what changed.`,
        grounding: `avg energy ${r1(first)} early vs ${r1(last)} lately · over ${vals.length} days`,
        effect: Math.abs(diff),
        viz: { kind: "trend", points: withE.map((l) => ({ day: l.day, value: l.energy })) },
      });
    }
  }

  scored.sort((a, b) => b.effect - a.effect);
  return {
    daysLogged,
    enough: true,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    patterns: scored.slice(0, 4).map(({ effect, ...p }) => p),
  };
}

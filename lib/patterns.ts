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

export type Pattern = { title: string; detail: string; grounding: string };
export type PatternResult = { daysLogged: number; enough: boolean; patterns: Pattern[] };

const MIN_DAYS = 7; // "after ~7 days" per the spec
const MIN_GROUP = 3; // samples needed on each side of a comparison
const MIN_EFFECT = 0.6; // meaningful gap on the 1–5 scale

const avg = (n: number[]) => n.reduce((a, b) => a + b, 0) / n.length;

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

/** Every pattern is a real computed comparison over the user's own logs. */
export function detectPatterns(data: PatternData): PatternResult {
  const daysLogged = data.logs.length;
  if (daysLogged < MIN_DAYS) return { daysLogged, enough: false, patterns: [] };

  const scored: (Pattern & { effect: number })[] = [];
  const withE = data.logs.filter((l) => l.energy != null) as (LogRow & { energy: number })[];

  // 1. Day-of-week energy dip
  if (withE.length >= MIN_DAYS) {
    const overall = avg(withE.map((l) => l.energy));
    const byDow = new Map<string, number[]>();
    for (const l of withE) {
      if (!byDow.has(l.dowFull)) byDow.set(l.dowFull, []);
      byDow.get(l.dowFull)!.push(l.energy);
    }
    let worst: { dow: string; a: number; n: number } | null = null;
    for (const [dow, arr] of byDow) {
      if (arr.length < 2) continue;
      const a = avg(arr);
      if (!worst || a < worst.a) worst = { dow, a, n: arr.length };
    }
    if (worst && overall - worst.a >= MIN_EFFECT) {
      scored.push({
        title: `Your energy dips on ${worst.dow}s`,
        detail: `On average, your energy runs lower on ${worst.dow}s than across the rest of your week.`,
        grounding: `avg energy ${worst.a.toFixed(1)} on ${worst.dow}s vs ${overall.toFixed(1)} overall · ${worst.n} ${worst.dow}s logged`,
        effect: overall - worst.a,
      });
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
        grounding: `avg energy ${da.toFixed(1)} on ${habit.name} days vs ${sa.toFixed(1)} without · ${done.length} vs ${skipped.length} days`,
        effect: da - sa,
      });
    }
  }

  // 3. Sleep → energy
  const withS = withE.filter((l) => l.sleep != null) as (LogRow & { energy: number; sleep: number })[];
  if (withS.length >= 6) {
    const good = withS.filter((l) => l.sleep >= 7).map((l) => l.energy);
    const poor = withS.filter((l) => l.sleep < 7).map((l) => l.energy);
    if (good.length >= MIN_GROUP && poor.length >= MIN_GROUP) {
      const ga = avg(good);
      const pa = avg(poor);
      if (ga - pa >= MIN_EFFECT) {
        scored.push({
          title: `You have more energy after 7+ hours of sleep`,
          detail: `Nights of 7 hours or more track with higher next-day energy for you.`,
          grounding: `avg energy ${ga.toFixed(1)} on 7h+ nights vs ${pa.toFixed(1)} on shorter · ${good.length} vs ${poor.length} days`,
          effect: ga - pa,
        });
      }
    }
  }

  scored.sort((a, b) => b.effect - a.effect);
  return {
    daysLogged,
    enough: true,
    patterns: scored.slice(0, 3).map(({ title, detail, grounding }) => ({ title, detail, grounding })),
  };
}

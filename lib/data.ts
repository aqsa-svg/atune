import { sql, sqlOne, sqlBatch, pgTextArray, parsePgArray } from "./db";
import type { SessionUser } from "./auth";

export type Profile = {
  wake_time: string | null;
  sleep_time: string | null;
  goals: string[];
  low_periods: string[];
};

export type Habit = {
  id: number;
  name: string;
  emoji: string | null;
  sort: number;
};

export type OnboardingInput = {
  wakeTime: string;
  sleepTime: string;
  goals: string[];
  lowPeriods: string[];
  habits: { name: string; emoji: string }[];
};

export type DailyLog = {
  mood: number | null;
  energy: number | null;
  sleepHours: number | null;
  note: string | null;
};

export type CheckinInput = {
  mood: number | null;
  energy: number | null;
  sleepHours: number | null;
  note: string | null;
  doneHabitIds: number[];
};

export type InsightMeta = { type?: string; action?: string; compare?: string };
export type Insight = { body: string; grounding: string | null; kind: string; meta: InsightMeta | null };

function parseMeta(v: unknown): InsightMeta | null {
  if (v == null) return null;
  if (typeof v === "string") {
    try {
      return JSON.parse(v) as InsightMeta;
    } catch {
      return null;
    }
  }
  if (typeof v === "object") return v as InsightMeta;
  return null;
}

export type WeekDay = {
  day: string; // YYYY-MM-DD
  dow: string; // Mon, Tue, ...
  energy: number | null;
  mood: number | null;
  isToday: boolean;
};

export type TodayData = {
  onboarded: boolean;
  habits: Habit[];
  insight: Insight | null;
  log: DailyLog | null;
  doneHabitIds: number[];
  week: WeekDay[];
};

// BIGINT/BIGSERIAL come back from the HTTP edge as strings — coerce to numbers.
function toHabit(r: Record<string, unknown>): Habit {
  return {
    id: Number(r.id),
    name: String(r.name),
    emoji: (r.emoji as string | null) ?? null,
    sort: Number(r.sort),
  };
}

/** Create or refresh the local mirror of a Cohesivity user + ensure a subscription row. */
export async function upsertUser(u: SessionUser): Promise<void> {
  await sqlBatch([
    {
      query: `INSERT INTO app_user (id, email, name, picture)
              VALUES ($1, $2, $3, $4)
              ON CONFLICT (id) DO UPDATE
                SET email = EXCLUDED.email, name = EXCLUDED.name, picture = EXCLUDED.picture`,
      params: [u.id, u.email, u.name, u.picture],
    },
    {
      query: `INSERT INTO subscription (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
      params: [u.id],
    },
  ]);
}

export async function isOnboarded(userId: number): Promise<boolean> {
  const row = await sqlOne<{ onboarded_at: string | null }>(
    `SELECT onboarded_at FROM app_user WHERE id = $1`,
    [userId],
  );
  return Boolean(row?.onboarded_at);
}

export async function getProfile(userId: number): Promise<Profile | null> {
  const row = await sqlOne<{
    wake_time: string | null;
    sleep_time: string | null;
    goals: unknown;
    low_periods: unknown;
  }>(`SELECT wake_time, sleep_time, goals, low_periods FROM profile WHERE user_id = $1`, [userId]);
  if (!row) return null;
  return {
    wake_time: row.wake_time,
    sleep_time: row.sleep_time,
    goals: parsePgArray(row.goals),
    low_periods: parsePgArray(row.low_periods),
  };
}

export async function getHabits(userId: number): Promise<Habit[]> {
  const rows = await sql<Record<string, unknown>>(
    `SELECT id, name, emoji, sort FROM habit
     WHERE user_id = $1 AND archived = FALSE ORDER BY sort, id`,
    [userId],
  );
  return rows.map(toHabit);
}

/** Create (or revive) a single habit and return it — powers the inline "add
 *  your own" control on the check-in screen. Reuses an existing habit of the
 *  same name (case-insensitive), un-archiving it, so history is never
 *  duplicated. New habits sort to the end of the list. */
export async function addHabit(userId: number, rawName: string): Promise<Habit | null> {
  const name = rawName.trim().slice(0, 40);
  if (!name) return null;

  const existing = await sql<Record<string, unknown>>(
    `SELECT id, name, emoji, sort FROM habit WHERE user_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1`,
    [userId, name],
  );
  if (existing.length) {
    const h = toHabit(existing[0]);
    await sql(`UPDATE habit SET archived = FALSE WHERE id = $1`, [h.id]);
    return h;
  }

  const rows = await sql<Record<string, unknown>>(
    `INSERT INTO habit (user_id, name, emoji, sort)
     VALUES ($1, $2, '🌱', COALESCE((SELECT MAX(sort) + 1 FROM habit WHERE user_id = $1), 0))
     RETURNING id, name, emoji, sort`,
    [userId, name],
  );
  return rows.length ? toHabit(rows[0]) : null;
}

/** Persist onboarding answers, habits, the day-one insight, and the onboarded
 *  flag in one atomic round-trip (the DB region is far, so batching matters). */
export async function persistOnboarding(
  userId: number,
  input: OnboardingInput,
  insight: { body: string; grounding: string },
): Promise<void> {
  await sqlBatch([
    {
      query: `INSERT INTO profile (user_id, wake_time, sleep_time, goals, low_periods, updated_at)
              VALUES ($1, $2, $3, $4::text[], $5::text[], NOW())
              ON CONFLICT (user_id) DO UPDATE
                SET wake_time = EXCLUDED.wake_time, sleep_time = EXCLUDED.sleep_time,
                    goals = EXCLUDED.goals, low_periods = EXCLUDED.low_periods, updated_at = NOW()`,
      params: [userId, input.wakeTime, input.sleepTime, pgTextArray(input.goals), pgTextArray(input.lowPeriods)],
    },
    { query: `DELETE FROM habit WHERE user_id = $1`, params: [userId] },
    ...input.habits.map((h, i) => ({
      query: `INSERT INTO habit (user_id, name, emoji, sort) VALUES ($1, $2, $3, $4)`,
      params: [userId, h.name, h.emoji, i],
    })),
    { query: `UPDATE app_user SET onboarded_at = NOW() WHERE id = $1`, params: [userId] },
    {
      query: `INSERT INTO insight (user_id, insight_date, kind, body, grounding)
              VALUES ($1, CURRENT_DATE, 'day_one', $2, $3)
              ON CONFLICT (user_id, insight_date, kind) DO UPDATE
                SET body = EXCLUDED.body, grounding = EXCLUDED.grounding`,
      params: [userId, insight.body, insight.grounding],
    },
  ]);
}

export async function storeInsight(
  userId: number,
  kind: string,
  body: string,
  grounding: string,
  meta: InsightMeta | null = null,
): Promise<void> {
  await sql(
    `INSERT INTO insight (user_id, insight_date, kind, body, grounding, meta)
     VALUES ($1, CURRENT_DATE, $2, $3, $4, $5::jsonb)
     ON CONFLICT (user_id, insight_date, kind) DO UPDATE
       SET body = EXCLUDED.body, grounding = EXCLUDED.grounding, meta = EXCLUDED.meta`,
    [userId, kind, body, grounding, meta ? JSON.stringify(meta) : null],
  );
}

export async function getLatestInsight(userId: number): Promise<Insight | null> {
  const row = await sqlOne<Record<string, unknown>>(
    `SELECT body, grounding, kind, meta FROM insight
     WHERE user_id = $1 ORDER BY insight_date DESC, id DESC LIMIT 1`,
    [userId],
  );
  if (!row) return null;
  return {
    body: String(row.body),
    grounding: (row.grounding as string | null) ?? null,
    kind: String(row.kind),
    meta: parseMeta(row.meta),
  };
}

/** Everything the Today + check-in screens need, in one round-trip. */
export async function getTodayData(userId: number): Promise<TodayData> {
  const [u, h, i, d, hl, w] = await sqlBatch([
    { query: `SELECT onboarded_at FROM app_user WHERE id = $1`, params: [userId] },
    {
      query: `SELECT id, name, emoji, sort FROM habit
              WHERE user_id = $1 AND archived = FALSE ORDER BY sort, id`,
      params: [userId],
    },
    {
      query: `SELECT body, grounding, kind, meta FROM insight
              WHERE user_id = $1 ORDER BY insight_date DESC, id DESC LIMIT 1`,
      params: [userId],
    },
    {
      query: `SELECT mood, energy, sleep_hours, note FROM daily_log
              WHERE user_id = $1 AND log_date = CURRENT_DATE`,
      params: [userId],
    },
    {
      query: `SELECT habit_id FROM habit_log
              WHERE user_id = $1 AND log_date = CURRENT_DATE AND done = TRUE`,
      params: [userId],
    },
    {
      // last 7 days, anchored to the DB's CURRENT_DATE so it can't drift from the
      // check-in dates; missing days come back with null energy/mood.
      query: `SELECT to_char(d::date, 'YYYY-MM-DD') AS day,
                     to_char(d::date, 'Dy')        AS dow,
                     dl.energy, dl.mood,
                     (d::date = CURRENT_DATE)       AS is_today
              FROM generate_series(CURRENT_DATE - 6, CURRENT_DATE, INTERVAL '1 day') d
              LEFT JOIN daily_log dl ON dl.user_id = $1 AND dl.log_date = d::date
              ORDER BY d`,
      params: [userId],
    },
  ]);

  const raw = d?.rows[0] as
    | { mood: number | null; energy: number | null; sleep_hours: string | number | null; note: string | null }
    | undefined;
  const log: DailyLog | null = raw
    ? {
        mood: raw.mood != null ? Number(raw.mood) : null,
        energy: raw.energy != null ? Number(raw.energy) : null,
        sleepHours: raw.sleep_hours != null ? Number(raw.sleep_hours) : null,
        note: raw.note,
      }
    : null;

  const week: WeekDay[] = ((w?.rows ?? []) as Record<string, unknown>[]).map((r) => ({
    day: String(r.day),
    dow: String(r.dow),
    energy: r.energy != null ? Number(r.energy) : null,
    mood: r.mood != null ? Number(r.mood) : null,
    isToday: Boolean(r.is_today),
  }));

  const irow = i?.rows[0] as Record<string, unknown> | undefined;
  const insight: Insight | null = irow
    ? {
        body: String(irow.body),
        grounding: (irow.grounding as string | null) ?? null,
        kind: String(irow.kind),
        meta: parseMeta(irow.meta),
      }
    : null;

  return {
    onboarded: Boolean((u?.rows[0] as { onboarded_at?: string | null } | undefined)?.onboarded_at),
    habits: ((h?.rows ?? []) as Record<string, unknown>[]).map(toHabit),
    insight,
    log,
    doneHabitIds: ((hl?.rows ?? []) as { habit_id: number | string }[]).map((r) => Number(r.habit_id)),
    week,
  };
}

/** Profile + active habits for the settings screen, in one round-trip. */
export async function getSettings(
  userId: number,
): Promise<{ profile: Profile | null; habits: Habit[] }> {
  const [p, h] = await sqlBatch([
    { query: `SELECT wake_time, sleep_time, goals, low_periods FROM profile WHERE user_id = $1`, params: [userId] },
    {
      query: `SELECT id, name, emoji, sort FROM habit
              WHERE user_id = $1 AND archived = FALSE ORDER BY sort, id`,
      params: [userId],
    },
  ]);
  const pr = p?.rows[0] as
    | { wake_time: string | null; sleep_time: string | null; goals: unknown; low_periods: unknown }
    | undefined;
  return {
    profile: pr
      ? {
          wake_time: pr.wake_time,
          sleep_time: pr.sleep_time,
          goals: parsePgArray(pr.goals),
          low_periods: parsePgArray(pr.low_periods),
        }
      : null,
    habits: ((h?.rows ?? []) as Record<string, unknown>[]).map(toHabit),
  };
}

/**
 * Update profile + habits from the settings screen. Unlike onboarding, this
 * PRESERVES habit history: removed habits are archived (not deleted, which would
 * cascade-delete their check-in logs), and kept habits keep their ids.
 */
export async function updateSettings(userId: number, input: OnboardingInput): Promise<void> {
  await sql(
    `INSERT INTO profile (user_id, wake_time, sleep_time, goals, low_periods, updated_at)
     VALUES ($1, $2, $3, $4::text[], $5::text[], NOW())
     ON CONFLICT (user_id) DO UPDATE
       SET wake_time = EXCLUDED.wake_time, sleep_time = EXCLUDED.sleep_time,
           goals = EXCLUDED.goals, low_periods = EXCLUDED.low_periods, updated_at = NOW()`,
    [userId, input.wakeTime, input.sleepTime, pgTextArray(input.goals), pgTextArray(input.lowPeriods)],
  );

  const existing = await sql<{ id: number | string; name: string; archived: boolean }>(
    `SELECT id, name, archived FROM habit WHERE user_id = $1`,
    [userId],
  );
  const byName = new Map(existing.map((h) => [h.name.toLowerCase(), h]));
  const desired = new Set(input.habits.map((h) => h.name.toLowerCase()));

  const stmts: { query: string; params: unknown[] }[] = [];
  input.habits.forEach((h, i) => {
    const ex = byName.get(h.name.toLowerCase());
    if (ex) {
      stmts.push({
        query: `UPDATE habit SET archived = FALSE, sort = $2, emoji = $3 WHERE id = $1`,
        params: [Number(ex.id), i, h.emoji],
      });
    } else {
      stmts.push({
        query: `INSERT INTO habit (user_id, name, emoji, sort) VALUES ($1, $2, $3, $4)`,
        params: [userId, h.name, h.emoji, i],
      });
    }
  });
  for (const ex of existing) {
    if (!desired.has(ex.name.toLowerCase()) && !ex.archived) {
      stmts.push({ query: `UPDATE habit SET archived = TRUE WHERE id = $1`, params: [Number(ex.id)] });
    }
  }
  if (stmts.length) await sqlBatch(stmts);
}

/** Upsert today's mood/energy/sleep/note and rewrite today's habit completions. */
export async function saveCheckin(userId: number, input: CheckinInput): Promise<void> {
  await sqlBatch([
    {
      query: `INSERT INTO daily_log (user_id, log_date, mood, energy, sleep_hours, note, updated_at)
              VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, NOW())
              ON CONFLICT (user_id, log_date) DO UPDATE
                SET mood = EXCLUDED.mood, energy = EXCLUDED.energy,
                    sleep_hours = EXCLUDED.sleep_hours, note = EXCLUDED.note, updated_at = NOW()`,
      params: [userId, input.mood, input.energy, input.sleepHours, input.note],
    },
    { query: `DELETE FROM habit_log WHERE user_id = $1 AND log_date = CURRENT_DATE`, params: [userId] },
    ...input.doneHabitIds.map((hid) => ({
      // guard: only log habits that actually belong to this user
      query: `INSERT INTO habit_log (user_id, habit_id, log_date, done)
              SELECT $1, $2, CURRENT_DATE, TRUE
              WHERE EXISTS (SELECT 1 FROM habit WHERE id = $2 AND user_id = $1 AND archived = FALSE)`,
      params: [userId, hid],
    })),
  ]);
}

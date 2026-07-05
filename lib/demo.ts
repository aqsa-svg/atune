import { sqlBatch } from "./db";
import { DEMO_USER_ID } from "./auth";

const HABITS = [
  { name: "Walk", emoji: "🚶" },
  { name: "Meditate", emoji: "🧘" },
  { name: "Sleep 7h", emoji: "😴" },
  { name: "No screens before bed", emoji: "🌙" },
];

/**
 * (Re)seed the shared guest-demo account with 14 days of *designed* data so the
 * app shows its real payoff instantly — the week fills in, and pattern detection
 * genuinely fires (Monday energy dip, walk→energy, sleep→energy). Idempotent:
 * every "Try the demo" click resets it to this presentable state.
 */
export async function seedDemo(): Promise<void> {
  const id = DEMO_USER_ID;

  const res = await sqlBatch([
    { query: `DELETE FROM habit_log WHERE user_id = $1`, params: [id] },
    { query: `DELETE FROM daily_log WHERE user_id = $1`, params: [id] },
    { query: `DELETE FROM insight WHERE user_id = $1`, params: [id] },
    { query: `DELETE FROM habit WHERE user_id = $1`, params: [id] },
    {
      query: `INSERT INTO app_user (id, email, name, picture, onboarded_at)
              VALUES ($1, $2, $3, NULL, NOW())
              ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name, onboarded_at = NOW()`,
      params: [id, "demo@attune.app", "Demo Explorer"],
    },
    {
      query: `INSERT INTO profile (user_id, wake_time, sleep_time, goals, low_periods, updated_at)
              VALUES ($1, '07:00', '23:30', '{"sleep","focus","stress"}'::text[], '{"monday","afternoons"}'::text[], NOW())
              ON CONFLICT (user_id) DO UPDATE SET wake_time = EXCLUDED.wake_time, sleep_time = EXCLUDED.sleep_time,
                goals = EXCLUDED.goals, low_periods = EXCLUDED.low_periods, updated_at = NOW()`,
      params: [id],
    },
    {
      query: `INSERT INTO subscription (user_id, tier, status, updated_at) VALUES ($1, 'premium', 'demo', NOW())
              ON CONFLICT (user_id) DO UPDATE SET tier = 'premium', status = 'demo', updated_at = NOW()`,
      params: [id],
    },
    ...HABITS.map((h, i) => ({
      query: `INSERT INTO habit (user_id, name, emoji, sort) VALUES ($1, $2, $3, $4) RETURNING id`,
      params: [id, h.name, h.emoji, i],
    })),
  ]);

  const habitResults = res.slice(-HABITS.length);
  const idByName: Record<string, number> = {};
  habitResults.forEach((r, i) => {
    const rid = (r?.rows?.[0] as { id?: number | string } | undefined)?.id;
    if (rid != null) idByName[HABITS[i].name] = Number(rid);
  });
  const walkId = idByName["Walk"];
  const meditateId = idByName["Meditate"];

  const stmts: { query: string; params: unknown[] }[] = [
    {
      // Monday = low; otherwise even calendar days are good (8h sleep, energy 4),
      // odd days weaker (5.5h, energy 3). Two Mondays over 14 days → dow pattern.
      query: `INSERT INTO daily_log (user_id, log_date, mood, energy, sleep_hours)
              SELECT $1, d::date,
                CASE WHEN EXTRACT(DOW FROM d) = 1 THEN 2 WHEN EXTRACT(DAY FROM d)::int % 2 = 0 THEN 4 ELSE 3 END,
                CASE WHEN EXTRACT(DOW FROM d) = 1 THEN 2 WHEN EXTRACT(DAY FROM d)::int % 2 = 0 THEN 4 ELSE 3 END,
                CASE WHEN EXTRACT(DAY FROM d)::int % 2 = 0 THEN 8.0 ELSE 5.5 END
              FROM generate_series(CURRENT_DATE - 13, CURRENT_DATE, INTERVAL '1 day') d`,
      params: [id],
    },
    {
      query: `INSERT INTO insight (user_id, insight_date, kind, body, grounding)
              VALUES ($1, CURRENT_DATE, 'daily', $2, $3)
              ON CONFLICT (user_id, insight_date, kind) DO UPDATE SET body = EXCLUDED.body, grounding = EXCLUDED.grounding`,
      params: [
        id,
        "Your energy dips on Mondays, and it runs clearly higher on the days you walk. A short walk is shaping up to be your most reliable lever — worth protecting on the low days.",
        "Grounded in 14 days of your own check-ins",
      ],
    },
  ];
  if (walkId) {
    stmts.push({
      query: `INSERT INTO habit_log (user_id, habit_id, log_date, done)
              SELECT $1, $2, d::date, TRUE FROM generate_series(CURRENT_DATE - 13, CURRENT_DATE, INTERVAL '1 day') d
              WHERE EXTRACT(DAY FROM d)::int % 2 = 0`,
      params: [id, walkId],
    });
  }
  if (meditateId) {
    stmts.push({
      query: `INSERT INTO habit_log (user_id, habit_id, log_date, done)
              SELECT $1, $2, d::date, TRUE FROM generate_series(CURRENT_DATE - 13, CURRENT_DATE, INTERVAL '1 day') d
              WHERE EXTRACT(DOW FROM d) IN (2, 4)`,
      params: [id, meditateId],
    });
  }

  await sqlBatch(stmts);
}

import { sql, sqlOne } from "./db";

export type Tier = "free" | "premium";

export async function getTier(userId: number): Promise<Tier> {
  const row = await sqlOne<{ tier: string }>(`SELECT tier FROM subscription WHERE user_id = $1`, [userId]);
  return row?.tier === "premium" ? "premium" : "free";
}

export async function setTier(userId: number, tier: Tier, note: string | null = null): Promise<void> {
  await sql(
    `INSERT INTO subscription (user_id, tier, status, updated_at) VALUES ($1, $2, $3, NOW())
     ON CONFLICT (user_id) DO UPDATE SET tier = EXCLUDED.tier, status = EXCLUDED.status, updated_at = NOW()`,
    [userId, tier, note],
  );
}

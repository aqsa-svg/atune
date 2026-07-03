import { COHESIVITY_BASE, COH_APP_KEY } from "./env";

type Row = Record<string, unknown>;

/** Run one SQL statement against the Cohesivity Postgres edge. `$1` placeholders. */
export async function sql<T = Row>(query: string, params: unknown[] = []): Promise<T[]> {
  const res = await fetch(
    `${COHESIVITY_BASE}/edge/postgres?key=${encodeURIComponent(COH_APP_KEY)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "attune/1" },
      body: JSON.stringify({ query, params }),
      cache: "no-store",
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DB ${res.status}: ${text.slice(0, 400)}`);
  }
  const data = (await res.json()) as { rows: T[] };
  return data.rows ?? [];
}

export async function sqlOne<T = Row>(query: string, params: unknown[] = []): Promise<T | null> {
  const rows = await sql<T>(query, params);
  return rows[0] ?? null;
}

export type BatchResult<T = Row> = { rows: T[]; rowCount?: number };

/** Run up to 50 statements as one transaction in a single round-trip.
 *  Results come back in statement order. */
export async function sqlBatch(
  statements: { query: string; params?: unknown[] }[],
): Promise<BatchResult[]> {
  const res = await fetch(
    `${COHESIVITY_BASE}/edge/postgres?key=${encodeURIComponent(COH_APP_KEY)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "attune/1" },
      body: JSON.stringify({
        statements: statements.map((s) => ({ query: s.query, params: s.params ?? [] })),
      }),
      cache: "no-store",
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DB batch ${res.status}: ${text.slice(0, 400)}`);
  }
  const data = (await res.json()) as { results?: BatchResult[] };
  return data.results ?? [];
}

/** Serialize a JS string[] to a Postgres array literal, e.g. {"a","b"}. */
export function pgTextArray(arr: string[]): string {
  return "{" + arr.map((s) => `"${String(s).replace(/(["\\])/g, "\\$1")}"`).join(",") + "}";
}

/** Parse whatever the edge returns for a text[] column into a JS string[]. */
export function parsePgArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === "string") {
    const inner = v.replace(/^\{/, "").replace(/\}$/, "");
    if (!inner) return [];
    return (
      inner
        .match(/"(?:[^"\\]|\\.)*"|[^,]+/g)
        ?.map((s) => s.replace(/^"/, "").replace(/"$/, "").replace(/\\(.)/g, "$1").trim()) ?? []
    );
  }
  return [];
}

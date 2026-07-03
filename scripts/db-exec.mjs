// Run a .sql file against the Cohesivity Postgres edge as one atomic batch.
// Usage: node scripts/db-exec.mjs db/schema.sql
// Reads COH_APP_KEY / COH_TENANT_ID / COHESIVITY_BASE from .env.local (or the environment).
import { readFileSync } from "node:fs";

function loadEnv(path) {
  const env = {};
  try {
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) env[m[1]] = m[2];
    }
  } catch {}
  return env;
}

const env = { ...loadEnv(".env.local"), ...process.env };
const BASE = env.COHESIVITY_BASE || "https://cohesivity.ai";
const KEY = env.COH_APP_KEY;
if (!KEY) {
  console.error("Missing COH_APP_KEY (.env.local)");
  process.exit(1);
}

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/db-exec.mjs <file.sql>");
  process.exit(1);
}

// Naive splitter: our schema has no semicolons inside string/identifier literals.
const statements = readFileSync(file, "utf8")
  .split(/;\s*(?:\r?\n|$)/)
  .map((s) =>
    s
      .split(/\r?\n/)
      .filter((l) => !/^\s*--/.test(l))
      .join("\n")
      .trim(),
  )
  .filter(Boolean)
  .map((query) => ({ query, params: [] }));

if (statements.length === 0) {
  console.error("No statements found in", file);
  process.exit(1);
}
if (statements.length > 50) {
  console.error(`Batch too large (${statements.length} > 50). Split the file.`);
  process.exit(1);
}

const res = await fetch(`${BASE}/edge/postgres?key=${encodeURIComponent(KEY)}`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "User-Agent": "attune-migrate/1" },
  body: JSON.stringify({ statements }),
});
const text = await res.text();
console.log("HTTP", res.status, `(${statements.length} statements)`);
console.log(text.slice(0, 2000));
process.exit(res.ok ? 0 : 1);

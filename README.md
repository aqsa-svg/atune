# Attune

**A wellness app that tells you what *your* data actually shows — and says "I don't know yet" instead of guessing.**

🔗 **Live demo: [attune-sigma-khaki.vercel.app](https://attune-sigma-khaki.vercel.app)** — click **"Try the demo — no sign-in."** It loads a guest account preloaded with two weeks of check-ins, so the coach and the detected patterns are visible immediately.

<!-- SCREENSHOT: Today dashboard showing one focal insight + the week rhythm strip.
     Replace this block with: ![Attune today dashboard](docs/screenshot-today.png) -->
> 📸 *Screenshot placeholder — Today dashboard (insight card + week-at-a-glance rhythm strip).*

---

## The problem

Habit trackers record. They don't explain. You log for three weeks, get a wall of streaks and charts, and still have no idea which of your habits is actually doing anything.

The obvious fix — pipe the logs into an LLM and ask for insights — fails in a specific, corrosive way: **the model invents patterns.** It will confidently tell you that your morning runs improve your sleep on day two, from four data points, referencing a habit you never created. For a wellness product this isn't a cosmetic bug. An invented pattern is worse than no insight, because the user can't tell the difference and will act on it.

So the interesting engineering problem in Attune isn't generating insights. It's **refusing to.**

## What it does

- **Check in under 30 seconds** — one-tap habits plus mood/energy/sleep, with an optional parser that reads "slept badly, skipped the gym, felt stressed" into structured fields.
- **One grounded insight per day** — a real *pattern* once there's enough data, a testable *experiment* while data is thin ("try X today, I'll compare tomorrow"), or an honest "still learning."
- **Pattern detection from your own rows** — day-of-week energy peaks and dips, habit→energy effects, and same-day *and* next-day sleep→energy lag, computed as plain statistics and never asked of the model.
- **A code-side gate with final authority** — model output is rejected, not trusted, unless it survives six checks against the user's actual data.
- **Cold start handled deliberately** — day one produces a personalized suggestion from onboarding answers alone, before a single log exists.

## Design decisions and tradeoffs

**The gate is code, not prompt.** Prompt instructions ("only use provided data") are advisory; the model can and does ignore them. [`lib/grounding.ts`](lib/grounding.ts) is 63 lines with **zero runtime imports** — no DB, no Next — which is the entire point: it's pure, so it can be unit-tested in isolation and can't be quietly bypassed. The prompt still asks for grounding, but the prompt is the request and the gate is the decision.

**Fail closed, not open.** `honestFallback()` is assigned *before* the model is called. Every failure path — network error, malformed JSON, an ungrounded reply — lands there by default rather than through exception handling. The tradeoff: a transient gateway failure looks identical to "not enough data yet" from the user's side. I chose a silent honest answer over an error toast, because a wellness app that says "still learning" keeps trust and one that says "AI service unavailable" doesn't. The cost is that genuine outages are invisible in the UI.

**Code owns the 7-day boundary, not the model.** `isGrounded` rejects any `pattern` when `dayCount < 7`, however convincing the model's evidence looks. This discards real insights a human analyst might legitimately draw from five days. That's deliberate: a false pattern costs more than a missed one.

**Statistics, not an LLM, for the patterns themselves.** [`lib/patterns.ts`](lib/patterns.ts) computes the correlations directly, so a surfaced number is arithmetic on the user's rows and cannot be hallucinated. The thresholds are honest heuristics, not significance tests:

| Constant | Value | Why |
|---|---|---|
| `MIN_DAYS` | 7 | below this, nothing is surfaced at all |
| `MIN_GROUP` | 3 | minimum samples on *each* side of a comparison |
| `MIN_EFFECT` | 0.6 | meaningful gap on a 1–5 self-report scale |
| `TREND_MIN` | 14 | a trend needs two weeks to mean anything |
| `TREND_EFFECT` | 0.7 | stricter, because trends are easier to see by accident |

**Habit references are matched by id *or* name.** The model mixes the two unpredictably. Accepting both is a small concession to model sloppiness that avoids rejecting otherwise-valid output — the check still fails on anything the user doesn't own.

## Results

Measured on this repo at current HEAD. Reproduce with the commands in the right column.

| Measured | Value | Reproduce |
|---|---|---|
| Test suite | **15 passing**, 3 files, 2.20s | `npm test` |
| — never-fabricate gate | 8 tests, covering all **6** reject paths | `npx vitest run lib/grounding.test.ts` |
| — pattern detection | 4 tests | `npx vitest run lib/patterns.test.ts` |
| — quick-fill parser | 3 tests | `npx vitest run lib/parse.test.ts` |
| Gate size | 63 lines, 0 runtime imports | `wc -l lib/grounding.ts` |
| Source size | 3,961 lines TS/TSX, tests excluded | `git ls-files` + `wc -l` |
| Clean install | 632 packages, 27s | `rm -rf node_modules && npm install` |
| Build with **no** `.env.local` | succeeds — 13 routes, 3 static / 10 dynamic | `npm run build` |

Not yet measured. These need a provisioned backend, and blank beats estimated:

- **[TODO] Gate rejection rate against live model output.** `scripts/test-coach.mjs` and `scripts/test-coach-v2.mjs` exercise the real coach path but need `COH_APP_KEY`. *To measure:* run N=200 generations across seeded profiles at 3, 7, and 21 days of data; report the share rejected by `isGrounded`, split by reject reason. This is the headline number the whole design exists to produce.
- **[TODO] p95 insight latency**, end to end through the AI gateway.
- **[TODO] Lighthouse scores** on the deployed demo.

## Architecture

```
  Daily check-in (<=30s)
  mood / energy / sleep / habits
             |
             |  write
             v
  +------------------------------------+
  |  Postgres  (Cohesivity, over HTTP) |
  +------------------+-----------------+
                     |  read: profile + last 14 days of logs + real habits
                     v
  +-------------------------------------------------+
  |  lib/coach.ts                                   |
  |  buildUser(data) -> prompt carries ONLY the     |
  |  user's real rows. No priors, no defaults.      |
  +----------------------+--------------------------+
                         |
   honest_fallback  <----+  pre-seeded BEFORE the call, so every
   (the default)         |  failure path lands here by default
                         v
              Claude Haiku 4.5 -> structured JSON
              { type, insight, evidence,
                references_habits, experiment }
                         |
                         v
  +---------------------------------------------------+
  |  lib/grounding.ts   isGrounded()                  |
  |  63 lines - pure - no DB, no Next - 8 unit tests  |
  |---------------------------------------------------|
  |  REJECT if:                                       |
  |    insight text empty                             |
  |    type not in {pattern, experiment, fallback}     |
  |    references a habit the user does not own        |
  |    type=pattern     AND dayCount < 7               |
  |    type=pattern     AND evidence[] empty           |
  |    type=experiment  AND no real habit/action/compare|
  +---------+-----------------------------+-----------+
            | pass                        | fail
            v                             v
    shown to the user             honest_fallback shown

  Patterns take a separate path that never touches the model:
  logs -> lib/patterns.ts (pure statistics) -> day-of-week peak/dip,
          habit->energy, sleep->energy same-day and next-day lag
```

## Stack

- **Next.js 16** (App Router, Server Components, Server Actions) · **React 19** · **TypeScript**
- **Tailwind v4** + **shadcn/ui** (Base UI) + **Motion** — custom "Twilight" design system, dark by default
- **Bricolage Grotesque** (display) + **General Sans** (body, self-hosted) + **Geist Mono**
- **Cohesivity** — managed Postgres over HTTP, Google social-login, and the AI gateway serving **Claude Haiku 4.5**
- **Vitest** for the gate, pattern, and parser suites
- Cookie-based auth with a route-level gate (`proxy.ts`) and silent token refresh

## Running locally

Verified from a clean clone on Node v24.12.0 / npm 11.6.2:

```bash
git clone https://github.com/aqsa-svg/attune.git
cd attune
npm install          # 632 packages, ~27s
npm test             # 15 passing
npm run build        # succeeds with no env vars set
```

`npm test` and `npm run build` need **no configuration** — the gate, pattern, and parser suites are pure functions. To run the app against live data, add `.env.local`:

```
COHESIVITY_BASE=https://cohesivity.ai
COH_TENANT_ID=...
COH_APP_KEY=...          # server-only; never shipped to the client
NEXT_PUBLIC_APP_URL=http://localhost:3000
COACH_MODEL=...          # optional; defaults to Claude Haiku 4.5
```

Then `npm run dev` → http://localhost:3000. Schema lives in [`db/schema.sql`](db/schema.sql), applied with `node scripts/db-exec.mjs db/schema.sql`.

## Known limitations

- **The demo is a single shared account.** `/api/demo` seeds one guest user; concurrent visitors write to the same rows and will see each other's data. Per-visitor isolation isn't built.
- **Outages are invisible by design.** Because the honest fallback is the default, a gateway failure renders as "still learning" with no error surfaced. Good for trust, bad for debugging — nothing distinguishes the two states for the user.
- **Thresholds are heuristics, not statistics.** `MIN_EFFECT = 0.6` on a 1–5 self-report scale is a judgment call, not a p-value. With `MIN_GROUP = 3`, a "pattern" can rest on three days per side.
- **A real new user sees no patterns for a week**, and no trends for two. Only the demo account skips this, because it ships pre-seeded.
- **The paywall is UI-only.** Premium gating renders, but there's no live Stripe checkout behind it.
- **No notifications**, so daily logging depends entirely on the user remembering.
- **Self-reported inputs.** Mood, energy, and sleep are what the user types, with no device or sensor corroboration.

## Project layout

```
app/            routes (landing, onboarding, today, check-in, insights) + server actions
components/     UI (design system, onboarding flow, insight card, week rhythm, paywall)
lib/            db, auth, data, coach (AI + grounding gate), patterns, suggest, demo seed
db/             SQL schema
scripts/        db-exec, coach smoke tests
```

---

*The interesting part isn't that it talks. It's that it refuses to make things up — and that the refusal is 63 lines of pure, tested code rather than a sentence in a prompt.*

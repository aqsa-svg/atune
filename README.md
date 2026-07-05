# Attune

**An AI wellness companion that learns your patterns and tells you what you need — grounded in your own data, and never made up.**

Most habit apps only *record*. Attune *understands*: it turns your 30-second daily check-ins into one grounded insight a day, and — crucially — it refuses to invent patterns it can't back with your data. That "never fabricate" guarantee is the whole point, and it's enforced in code, not vibes.

> **Try it in 5 seconds:** open the app and click **"Try the demo — no sign-in."** It loads a guest account preloaded with two weeks of data so you immediately see the AI coach and real detected patterns.

---

## Why it's different

1. **It learns *you*, not everyone.** Not "sleep 8 hours" — "*your* energy dips on Mondays, and it's higher on the days you walk."
2. **It never fabricates.** Every insight is grounded in the data passed to the model. A deterministic gate rejects any output that references a habit you don't have or claims a multi-day pattern before there's enough data. When data is thin, it says so instead of guessing.
3. **It gets sharper over time.** Day one gives a personalized suggestion from your onboarding answers; after ~7 days, pattern detection surfaces things you can't see yourself.

## Features

- **Onboarding** → a personalized day-one suggestion before any data exists (solves the cold-start problem).
- **Daily check-in** in under 30s — one-tap habits + mood/energy/sleep, with an optional "quick fill from your words" parser.
- **Today dashboard** — one focal insight, a calm week-at-a-glance rhythm strip, today's habits.
- **AI coach** — one grounded insight/day via Claude, behind a faithfulness gate.
- **Pattern detection** — day-of-week energy, habit→energy, and sleep→energy correlations, computed purely from your logs.
- **Freemium** — logging + weekly view free; deep patterns/predictive coaching are premium.

## The "never fabricate" architecture

This is the moat, so it's built deliberately:

- The coach prompt receives **only** the user's real logged data (`lib/coach.ts`).
- The model returns structured JSON with an `enough_data` flag and the `evidence`/`habits` it relied on.
- A **deterministic grounding gate** (`isGrounded`) rejects the output if it names a habit that doesn't exist, claims a pattern with fewer than 4 days logged, or cites no evidence — falling back to an honest "still learning" message.
- **Pattern detection** (`lib/patterns.ts`) is pure statistics over the user's own rows, so a surfaced pattern can only ever be a real number from their data.

## Tech stack

- **Next.js 16** (App Router, Server Components, Server Actions) · **React 19** · **TypeScript**
- **Tailwind v4** + **shadcn/ui** (Base UI) + **Motion** — custom "Twilight" design system, dark-default
- **Bricolage Grotesque** (display) + **General Sans** (body, self-hosted) + **Geist Mono**
- **Cohesivity** — managed Postgres (over HTTP), Google social-login, and the AI gateway serving **Claude Haiku 4.5**
- Cookie-based auth with a route-level gate (`proxy.ts`) and silent token refresh

## Running locally

```bash
npm install
npm run dev        # http://localhost:3000
```

Environment (`.env.local`) — provisioned via the Cohesivity backend:

```
COHESIVITY_BASE=https://cohesivity.ai
COH_TENANT_ID=...
COH_APP_KEY=...          # server-only; never shipped to the client
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Database schema lives in [`db/schema.sql`](db/schema.sql) and is applied with `node scripts/db-exec.mjs db/schema.sql`.

## Project layout

```
app/            routes (landing, onboarding, today, check-in, insights) + server actions
components/     UI (design system, onboarding flow, insight card, week rhythm, paywall)
lib/            db, auth, data, coach (AI + grounding gate), patterns, suggest, demo seed
db/             SQL schema
```

## Status & roadmap

Built: the full MVP loop (auth → onboarding → check-in → dashboard → coach → patterns → paywall) + a no-login guest demo.

Next: live Stripe checkout, per-visitor demo isolation, a test suite around the grounding gate + pattern detection, and smart notifications.

---

*Built as a demonstration of grounded, trustworthy GenAI product engineering — the interesting part isn't that it talks, it's that it refuses to make things up.*

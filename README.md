# Fitness Mini App

Telegram Mini App: 21-day fitness course with workout logging, rest timer, calorie onboarding, and a training journal. Built with Next.js 15 + TypeScript.

**Live:** https://fitness-miniapp-mu.vercel.app/course
**Stack:** Next.js 15 (App Router) · React · TypeScript · TailwindCSS · Framer Motion · Telegram WebApp SDK

---

## Features

- **21-day program** — 3 levels (beginner / intermediate / advanced) × 2 tracks (gym / home) = 6 distinct programs, persisted in localStorage.
- **Workout logger** — log sets as `kg × reps`, keyed by `YYYY-MM-DD` so the journal reflects real training dates, not nominal program days.
- **Training journal** — month calendar with color-coded volume (amber: partial, green: 6+ sets), current streak and personal record.
- **Rest timer** — presets 2/3/4/5/7/10 min, persists across navigation, plays a gong sample (`Web Audio API`) and triggers Telegram `HapticFeedback.notificationOccurred("success")` on finish.
- **Supersets** — pairs consecutive exercises into A/B/C groups; toggle on/off without losing logs.
- **Exercise variants** — long-press an exercise to swap (dumbbell / machine / barbell), per-day persistence.
- **Calorie onboarding** — 14-step wizard: Mifflin-St Jeor BMR, activity multiplier, weekly speed slider with safety warnings, macro override sheet.
- **i18n** — Ukrainian / English, runtime toggle.
- **Telegram auth** — HMAC-SHA256 verification of `initData` per the Telegram WebApp spec.

---

## Architecture
src/
app/                          App Router routes
course/                     Workout pages (course, progress, tools, knowledge)
(onboarding)/calories/      Calorie onboarding entry
api/verify/                 Telegram initData verification
features/
calories/onboarding/        Wizard: state machine, calculations, UI
common/wheel/               Wheel + ruler pickers (custom, no deps)
lib/
verifyInitData.ts           HMAC-SHA256 Telegram auth
useHaptics.ts               Haptics with browser fallback
storage.ts                  localStorage progress
i18n/                       UK / EN dictionaries

**State.** `useReducer` for the onboarding machine; localStorage for everything that survives a reload (logs by date, program selection, variants, timer remaining, daily intensity).

**Logging schema.** `log_${YYYY-MM-DD}_${programDay}_${exerciseIndex}` → `[{kg, reps}, ...]`. The journal scans dates locally to compute streaks and per-day totals.

**Calorie engine.** `calculatePlan()` in `src/features/calories/onboarding/calculations.ts`: BMR (Mifflin-St Jeor), TDEE via activity factor (1.375 / 1.55 / 1.725), deficit/surplus clamped (300–1100 / 200–800 kcal), protein 2.0–2.2 g/kg, fat 0.6–0.8 g/kg, carbs from remainder.

---

## Run locally

```bash
npm install
npm run dev
# http://localhost:3000
```

### Environment
TELEGRAM_BOT_TOKEN=          # required when REQUIRE_TELEGRAM_INIT=true
REQUIRE_TELEGRAM_INIT=false  # set to true in production to enforce initData
NEXT_PUBLIC_APP_NAME=        # optional, browser tab title

### Tests

```bash
npx playwright install --with-deps
npm run test:e2e
```

The Playwright suite (`tests/smoke/onboarding.spec.ts`) walks the calorie onboarding flow and checks navigation to `/tools`.

---

## Deployment

Deployed on Vercel. Build is the default Next.js pipeline; no custom server. The `/api/verify` route runs on Vercel's Node runtime.

---

## Roadmap

- Server-side persistence (Postgres + Prisma) to replace localStorage
- Push notifications via Telegram Bot API for missed training days
- Export training history to CSV
- Video library (currently placeholder `/demo-video.mp4`)

---

## License

MIT

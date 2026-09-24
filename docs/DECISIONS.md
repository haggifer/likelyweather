# Decisions

Decisions already made in the project guide are listed in `PROJECT_GUIDE.md` §17. This file records the choices made while building the prototype (2026-09-23), including every place it deliberately departs from the guide, and what it would take to converge.

## P1. One Next.js app instead of the pnpm + Turborepo monorepo

The prototype is a single Next.js 16 app so it runs with `pnpm dev` and nothing else. The guide's packages map onto folders:

| Guide | Prototype |
|---|---|
| `packages/shared` | `src/shared` (zod contract, model palette, variables, ensemble math, time helpers) |
| `packages/charts` | `src/charts` (D3 hero charts, Recharts wrappers, `theme.ts`) |
| `packages/ui` presets | `src/theme` |
| `apps/api` | `src/app/api/**/route.ts` + `src/server` |
| `apps/collector` | `src/server/collector.ts` + `scripts/collect.ts` |
| `apps/skill-job` | `src/server/skill.ts` + `src/server/analysis.ts` (computed on request, see P5) |
| `packages/db` | `src/server/store.ts` (see P3) |

Converging: move each folder into its package; imports already go through `@/shared`, `@/server`, `@/charts`.

## P2. Next.js route handlers instead of Express 5 on Lambda

Same REST paths, same zod schemas (`src/shared/api.ts`), same `{error: {code, message}}` shape, same `Cache-Control: public, max-age=300` on public reads and the same per-IP rate limits (120 reads/min, 30 geocode/min, 10 tracks/h). `src/server/http.ts` is the thin handler wrapper; moving to Express is a mechanical port of each `route.ts`.

## P3. JSON files instead of Postgres and S3

Docker was not running on the build machine and the prototype should run without it. `src/server/store.ts` keeps the guide's table shapes: `data/cities.json` (City), `data/runs.json` (CollectionRun), `data/forecasts/<cityId>/<issueTime>.json` (Forecast rows in columnar form per run and city), `data/raw/<runId>/*.json` (the S3 raw archive). Read-modify-write cycles take a cross-process file lock so the collector CLI and the dev server never interleave. `/api/runs/:id/archive` returns the raw JSON directly instead of a presigned URL.

Converging: implement the same exported functions with Prisma; nothing above `store.ts` changes.

## P4. In-process cache instead of Redis

`src/server/cache.ts` implements the four Redis uses from guide §22 with the same key names and TTLs (geocode 24 h, previous-runs data 3 h, fixed-window rate limits, request de-duplication). State lives on `globalThis`, so it is per process, which is exactly the Lambda problem the guide describes; that is acceptable for a single local process. The collector lock is a lock file with a 10-minute expiry (`acquireJobLock`), the equivalent of `SET lock:collector NX EX 600`.

## P5. Skill and evolution from Open-Meteo's Previous Runs API (guide phase 7 pulled forward)

The guide builds skill from its own stored runs, so a new city waits 7 days for a scoreboard. The Previous Runs API (`previous-runs-api.open-meteo.com`) returns, for any location, each model's forecast from the runs issued 1 to 7 days before every hour, for the nine Open-Meteo models, back to early 2024. Verified on 2026-09-23 for all nine models over 90 days (about 7 s per request).

Consequences:
- The scoreboard works on day one for any city, including ones tracked a minute ago.
- Lead buckets are 24, 48, 72 and 96 h (runs 1 to 4 days earlier) instead of 6 to 96 h. The 6/12/18/36 h buckets need the app's own stored runs.
- "Analysis" is `previous_day0`: the most recent run's value at that hour (0 to 6 h lead). Consensus truth is the median of those with at least 5 models, as in the guide.
- MET Norway has no archive, so it is not scored yet (explained on its model page).
- Evolution shows 8 daily issue offsets (7 days before to latest) instead of the last 16 six-hourly issue times.
- There is no nightly skill job: scores are computed on request and cached for 3 hours.

Converging: once the collector has stored enough runs, compute `ForecastError`/`SkillDaily` from them in a skill job and keep the Previous Runs data as a backfill (`origin = IMPORT`).

## P6. Hourly fetch aggregated to the 6-hour grid

The reference collector used `temporal_resolution=hourly_6`, where precipitation at a step is the one-hour amount (its notes flag the undercount). The prototype fetches hourly data and aggregates on the server: instant variables are sampled at 00/06/12/18 UTC and precipitation is the six hours ending at the step. met.no precipitation uses `next_6_hours` of the entry six hours earlier (or the six `next_1_hours` blocks), so met.no joins the precipitation panel on the same basis. A sum with any missing hour is null rather than an undercount.

## P7. A view refreshes a stale city (local stand-in for the scheduler)

There is no EventBridge locally. When `/latest` is requested and the newest snapshot predates the current 6-hour grid, the city is refreshed through the collector's code path with origin `PREVIEW`, de-duplicated so parallel requests share one upstream call. `pnpm collect` is the scheduled path for all active cities (with dormancy, the queue and the lock); `pnpm collect --loop` keeps running it every 6 hours. "Preview" in the UI means the city has no scheduled run yet.

## P8. Ensemble statistics and disagreement labels are derived on the client

Following the `api-design` rule (return raw data, derive on the client), `/latest` returns the raw series per model and the client computes median, quartiles, min–max, the disagreement tiles, median wind direction and chance of rain with the pure functions in `src/shared/ensemble.ts` (unit-tested). The disagreement thresholds live in `src/shared/variables.ts`, a shared module, so the guide's documented exception (`disagreement.label` from the server) is not needed.

Likewise `/scoreboard` returns one cell per model and lead bucket (n, MAE, bias, RMSE, hit rate, daily sparkline, ten worst errors); the ranking for the selected lead is a client-side view of those cells, so changing the lead needs no request.

## P9. Model palette and colour-vision safety

The guide fixes the model palette and forbids reassigning it. Running the dataviz validator on it: lightness and contrast pass, but ECMWF IFS (`#1D4ED8`) and ECMWF AIFS (`#7C3AED`) are only ΔE 3.4 apart for protanopes and 13.0 for normal vision, and met.no's `#475569` reads as gray. The colours stay; AIFS (dash `6 3`) and met.no (dash `2 3`) get a dash pattern as secondary encoding everywhere a model line or swatch appears, and every chart has a legend, a hover highlight and a table view.

## P10. Locale in a cookie, not the URL

`next-intl` runs without i18n routing: the language switch sets `NEXT_LOCALE` and refreshes. City names come from the geocoder in both languages (`nameLocal.uk`). Moving to locale-prefixed URLs needs a `[locale]` segment and the next-intl proxy.

## P11. Theme Lab never ships

`Providers.tsx` imports the lab with `next/dynamic` inside a branch on the inlined literal `process.env.NEXT_PUBLIC_THEME_LAB === '1'`; with `0` the branch is dead and no chunk is emitted. `pnpm check:no-lab` greps `.next/static` for a string that only exists in the panel; verified failing on a lab-on build and passing on a lab-off build. Candidate fonts are declared with `preload: false`, so a browser only downloads the ones a combination uses. `/theme-lab` calls `notFound()` when the flag is off.

## P12. Smaller choices

- shadcn/ui with the Radix base (`radix-nova`), as the guide specifies. The surface axis restyles every `[data-slot=card]` from `globals.css`; status chips and the source line live in `@layer components` so utilities can still hide them.
- Country flags are the MIT-licensed `country-flag-icons` 3×2 SVGs copied into `public/flags` (`pnpm flags`).
- TanStack Table is pinned to v8; v9 was current on npm with a new API.
- Redux owns filter state; `useUrlSync` hydrates it from the URL once per page (queries wait for that), then mirrors Redux back into the URL with nuqs.
- `useNow` returns null during server rendering and hydration, so the "now" line never causes a hydration mismatch.

## Open: the design decision (guide phase 2.5)

Not made yet. Base tokens are preset A (Sky). To decide: run `pnpm dev`, open the Lab (Ctrl/Cmd+Shift+T) on `/theme-lab`, a live city dashboard and its scoreboard, star favourites, then `Copy CSS` into `globals.css` and record the choice and the runners-up with screenshots here.

# Decisions

Decisions already made in the project guide are listed in `PROJECT_GUIDE.md` §17. This file records the choices made while building the prototype (from 2026-09-23), including every place it deliberately departs from the guide, and what it would take to converge. Guide v3.0 (2026-09-24) absorbed P17 to P19, v3.1 P20, and v3.2 P21.

## P1. One Next.js app instead of the pnpm + Turborepo monorepo

The prototype is a single Next.js 16 app so it runs with `pnpm dev` and nothing else. The guide's packages map onto folders:

| Guide                 | Prototype                                                                          |
| --------------------- | ---------------------------------------------------------------------------------- |
| `packages/shared`     | `src/shared` (zod contract, model palette, variables, ensemble math, time helpers) |
| `packages/charts`     | `src/charts` (D3 hero charts, Recharts wrappers, `theme.ts`)                       |
| `packages/ui` presets | `src/theme`                                                                        |
| `apps/api`            | `src/app/api/**/route.ts` + `src/server`                                           |
| `apps/collector`      | `src/server/collector.ts` + `scripts/collect.ts`                                   |
| `packages/db`         | `src/server/store.ts` (see P3)                                                     |

Converging: move each folder into its package; imports already go through `@/shared`, `@/server`, `@/charts`.

## P2. Next.js route handlers instead of Express 5 on Lambda

Same REST paths, same zod schemas (`src/shared/api.ts`), same `{error: {code, message}}` shape, same `Cache-Control: public, max-age=300` on public reads and the same per-IP rate limits (120 reads/min, 30 geocode/min, 10 tracks/h). `src/server/http.ts` is the thin handler wrapper; moving to Express is a mechanical port of each `route.ts`.

## P3. JSON files instead of Postgres and S3

Docker was not running on the build machine and the prototype should run without it. `src/server/store.ts` keeps the guide's table shapes: `data/cities.json` (City), `data/runs.json` (CollectionRun), `data/forecasts/<cityId>/<issueTime>.json` (Forecast rows in columnar form per run and city), `data/raw/<runId>/*.json` (the S3 raw archive). Read-modify-write cycles take a cross-process file lock so the collector CLI and the dev server never interleave. `/api/runs/:id/archive` returns the raw JSON directly instead of a presigned URL.

Converging: implement the same exported functions with Prisma; nothing above `store.ts` changes.

## P4. In-process cache instead of Redis

`src/server/cache.ts` implements the four Redis uses from guide §22 with the same key names and TTLs (geocode 24 h, previous-runs data 3 h, fixed-window rate limits, request de-duplication). State lives on `globalThis`, so it is per process, which is exactly the Lambda problem the guide describes; that is acceptable for a single local process. The collector lock is a lock file with a 10-minute expiry (`acquireJobLock`), the equivalent of `SET lock:collector NX EX 600`.

## P5. Evolution from Open-Meteo's Previous Runs API (removed, see P20)

The Previous Runs API (`previous-runs-api.open-meteo.com`) returns, for any location, each model's forecast from the runs issued 1 to 7 days before every hour, for the nine Open-Meteo models, back to early 2024 (verified on 2026-09-23, about 7 s per request). The evolution view uses it, so it works on day one for any city:

- It shows 8 daily issue offsets (7 days before to latest) instead of the last 16 six-hourly issue times.
- MET Norway has no archive, so it does not appear in the evolution view.
- Responses are cached for 3 hours.

Until 2026-09-24 the same API also fed a scoreboard (truth from the models' own analyses, MAE, bias and RMSE per lead bucket). It was removed with the MVP scope change in P17.

Converging: once the collector has stored enough runs, evolution can read the app's own runs at 6-hourly resolution and keep the Previous Runs data as a backfill (`origin = IMPORT`).

## P6. Hourly fetch aggregated to the 6-hour grid

The reference collector used `temporal_resolution=hourly_6`, where precipitation at a step is the one-hour amount (its notes flag the undercount). The prototype fetches hourly data and aggregates on the server: instant variables are sampled at 00/06/12/18 UTC and precipitation is the six hours ending at the step. met.no precipitation uses `next_6_hours` of the entry six hours earlier (or the six `next_1_hours` blocks), so met.no joins the precipitation panel on the same basis. A sum with any missing hour is null rather than an undercount.

## P7. A view refreshes a stale city (local stand-in for the scheduler)

There is no EventBridge locally. When `/latest` is requested and the newest snapshot predates the current 6-hour grid, the city is refreshed through the collector's code path with origin `PREVIEW`, de-duplicated so parallel requests share one upstream call. `pnpm collect` is the scheduled path for all active cities (with dormancy, the queue and the lock); `pnpm collect --loop` keeps running it every 6 hours. "Preview" in the UI means the city has no scheduled run yet.

## P8. Ensemble statistics and disagreement labels are derived on the client

Following the `api-design` rule (return raw data, derive on the client), `/latest` returns the raw series per model and the client computes median, quartiles, min–max, the disagreement tiles, median wind direction and chance of rain with the pure functions in `src/shared/ensemble.ts` (unit-tested). The disagreement thresholds live in `src/shared/variables.ts`, a shared module, so the guide's documented exception (`disagreement.label` from the server) is not needed.

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

## P13. Landing: median overview, in-place city selection, no header search, no "popular now"

Decided by the author on 2026-09-23 after the first review.

- The landing chart is no longer a spaghetti preview (that belongs to the dashboard). It shows the median of all models for temperature, wind speed (with median direction arrows), pressure and precipitation as four panels on one time axis, with day lines and a crosshair that drives the readouts. Per-model detail on hover is intentionally not built yet. The grid, the time window and the now line changed on 2026-09-24: see P18 and P19.
- The search box moved out of the header; the landing page is the search hub. Choosing a search result or a "Start with" chip keeps the user on the landing page and switches the overview (`?city=` keeps it linkable); "Open details" goes to the dashboard. A city not yet tracked is still tracked on selection, because the overview needs its forecast.
- "Start with" is New York, London, Paris, Kyiv. Paris was added to the seed cities; the store merges any missing seed on read.
- "Popular now" was removed as too ambitious for a portfolio project, together with `GET /api/cities/popular` (guide §3.1 and §8 list it).
- The wordmark is stacked on two lines next to a 32 px icon. Evaluated as a good move once the header lost the search box: it gives the brand more presence without widening the bar, and it still fits the compact 48 px density.

## P14. Five UI languages

Ukrainian, English, Spanish, German and French (`Locale` enum, `messages/*.json` with identical keys). The language menu lists each language by its own name. City names come from the geocoder per locale (`nameLocal`); country names come from `Intl.DisplayNames`, so they need no storage; region names stay in English. The Spanish, German and French catalogs are machine-drafted and should get a native review, as the Ukrainian one should (guide §19, question 3).

## P15. Gridlines and day lines

A variable can declare a gridline step (`tickStep` in `src/shared/variables.ts`): 5 °C for temperature and 2 m/s for wind speed; the y domain snaps outward to that step (`src/charts/scales.ts`). Pressure keeps automatic ticks. Precipitation declares a ladder of steps instead (`tickSteps`: 0.5, 1, 2, 5, 10, 20, 50 mm): the domain starts at 0 and uses the smallest step that reaches the maximum in at most three segments. Both sources report 0.1 mm amounts, so 0.5 mm is the finest step that reads cleanly, and a dry forecast shows exactly two ticks, 0 and 0.5. This was decided on 2026-09-24; before, automatic ticks produced labels like 0, 0.0, 0.0, 0.1. Every time chart draws day boundaries the same way (`DayGrid`): a solid hairline at the city's local midnight, with the day label centred in the day. The precipitation panel (Recharts, categorical axis) draws the boundary before the first 6-hour total of each new local day.

## P16. The Theme Lab never fetches

The gallery (`/theme-lab`) renders a static dump of real API payloads, `src/fixtures/lab-dump.json` (city, and the 6-hour and hourly `latest` payloads for all four variables), captured with `pnpm lab:dump` through the same server code the API uses, without writing to the store. Gallery components are presentational and receive data as props; the capture time is used as "now" so the charts stay stable. The gallery and the dump load only behind `NEXT_PUBLIC_THEME_LAB`, `pnpm check:no-lab` also looks for them, and `outputFileTracingExcludes` keeps fixtures and `data/` out of server traces.

## P17. MVP scope: forecasts only (2026-09-24)

Decided by the author: comparing forecasts with what actually happened is a separate feature, not part of the MVP. Removed from the prototype:

- the scoreboard (`/city/[slug]/scoreboard`, `GET /api/cities/:slug/scoreboard`), the model detail page (`/models/[id]`, `GET /api/models/:id`), and the skill maths (`src/server/skill.ts`: consensus and self-analysis truth, MAE, bias, RMSE, hit rate, lead buckets, sample thresholds);
- the 30-day MAE column in the dashboard legend, the truth line and truth figure in the evolution view, the "Score the models" landing tile, and the truth and skill sections of the methodology;
- the scoreboard filters in Redux and the URL (`window`, `mode`, `lead`).

Kept at the time: the dashboard, evolution (removed later the same day, see P20), compare, runs, cities, methodology and the Theme Lab. The landing title now reads "Compare weather forecasts for your city". Guide v3.0 moves truth, skill and the scoreboard to a post-MVP phase and drops the skill-job Lambda and its tables from the MVP. `GET /api/models` stays as plain model metadata.

## P18. Landing overview on local 3-hour slots

Decided by the author on 2026-09-24. The overview shows 72 hours in 3-hour slots on the city's local clock (00, 03, 06…), starting at the slot the data arrived in. The city dashboard keeps the 6-hour UTC grid.

- Each snapshot now also stores the run on an hourly grid (`Snapshot.hourly`, from 12 h before the issue time to 96 h after). The collector parses the same upstream responses twice, so no extra requests are made. Snapshots stored before this change have no hourly grid and are refreshed once on the next view.
- `GET /api/cities/:slug/latest?resolution=hourly` returns that grid; the default stays the 6-hour grid. Following the API rule in P8, the client builds the slots (`src/shared/slots.ts`) with the same resampler the server uses (`src/shared/resample.ts`, moved to `shared`).
- Instant values are read at each slot. A precipitation slot is the amount of the 3 hours after it, so the first readout of a fresh chart is the coming 3 hours, and its bar is drawn to the right of the slot.
- Slots stay on whole UTC hours, where the hourly data is. A half-hour time zone (India, for example) gets slots at :30 local. Slots are evenly spaced, so after a DST change inside the window the later slots sit one hour off the local marks until the next refresh.
- MET Norway publishes hourly values only for about the first 60 hours; later slots take the median of the other models.
- The readout summaries cover the next 24 hours instead of four days. The chart already shows three days, and "today and tonight" is the more useful glance on the main screen; the dashboard is one click away.
- Layout: four panels, each on a very light rounded background (`--chart-grid` at 40 percent, 4 px radius) so they read as separate charts, with a 14 px gap matching the readouts on the left. Day lines, past shading, the now line and the crosshair are drawn per panel. Tick labels sit on the left and day labels below the last panel; the strip above the first panel shows the hovered slot's time at the crosshair. The loading skeleton is built from the same row layout and header height, so it matches the loaded card to the pixel (checked in the gallery, which shows both). The run and model-count line under the city name was removed; the region and country follow the city name in muted text.

## P19. The overview is anchored when the data arrives; Refresh

The overview starts at the slot the data arrived in, so on arrival "now" is the start of the chart and no now line is drawn. The hourly queries never refetch in the background, because that would silently re-anchor the chart. Once the current time moves into a later slot the chart is stale: the now line and the past shading appear and the Refresh button is enabled. Refresh refetches the four hourly payloads and re-anchors the chart.

Refresh does not hit the upstream sources harder: the server only calls Open-Meteo and met.no when a new 6-hour run exists, and concurrent refreshes are de-duplicated. Gating the button in the UI is about a sensible interaction, not the protection.

## P20. No evolution view; variable switch in the body; tiles beside the overview (2026-09-24)

Decided by the author, checked before removing.

- **Evolution removed.** Run-to-run charts of one hour's forecast are the "dprog" charts of forecaster and enthusiast sites. Mainstream weather apps do not have them, and reading them needs the ideas of model runs and lead time. Removed:
    - `/city/[slug]/evolution`, `GET /api/cities/:slug/evolution` and `/steps`;
    - `src/server/evolution.ts` and the Previous Runs source (`src/server/sources/previousRuns.ts`, `OPEN_METEO_PREVIOUS_RUNS_BASE`), so the MVP no longer calls that API;
    - the evolution chart and view, its gallery section and dump entry, and the methodology section;
    - the `filters` slice. The URL-hydrated flag moved into the `dashboard` slice, and `useUrlSync` now mirrors only `?v=`.

    The design stays in guide section 9.2 as part of post-MVP accuracy, and the code is in the history (P5).

- **No section tabs on city pages.** With only the dashboard left, the Dashboard/Evolution control in the top bar and the city header is gone.
- **Variable switch in the body.** It moved from the top bar and city header to the top of the dashboard body, where it has room for labels (hidden on phones only).
- **Landing tiles.** "Watch it converge" gave way to "How it works" (methodology), keeping three tiles. From 1600 px (`3xl`, 100rem, defined in `globals.css` because Tailwind cannot order an arbitrary `min-[1600px]` against its rem breakpoints) the tiles stack in a column beside the 1024 px overview card, stretched to its height. Measured: at 1600 px the column is 312 px wide with three 166 px tiles; at 1920 px the block stays centered under the hero; below 1600 px the row of three under the card is unchanged.

## P21. The dashboard adopts the overview's time model; city switcher; performance (2026-09-24)

Decided by the author.

- **Time model.** The dashboard chart shows 96 hours in local 3-hour slots from the slot the data arrived in, built from the hourly grid (`useLatest` now reads it, sharing the cache with the landing overview and the Updated chip). The past 24 hours of analysis are gone. The now line appears only once the chart is a slot old; the 15-minute background refetch re-anchors it. The precipitation query's arrival time is the anchor because that query is shared by every variable. The hovered time sits above the crosshair.
- **Precipitation as bars.** Precipitation totals are drawn as median bars with a tick per model instead of smoothed lines, which suggested a continuous rate and could overshoot between points. On the 3-hour slots a bar covers the 3 hours after its slot; on the 6-hour grid (compare) the 6 hours before its step (`getSumBarCenter`). The disagreement tiles file each slot's total under the day it ends. The precipitation panel stays at 6-hour totals, which its hour labels and chance-of-rain row need to fit, now counted from the chart start and labelled by the hour each ends; its y-axis uses the shared 0.5 / 1 / 2 / 5 mm steps and covers every model's tick.
- **Longer hourly grid.** It now runs to 108 hours after each run (`HOURLY_FORECAST_HOURS`, Open-Meteo `forecast_days=6`), so a 96-hour chart from any later slot is covered. Snapshots with a shorter grid are refreshed once on the next view.
- **Header.** A "Back to overview" link returns to `/?city=<slug>`. The name line carries the region and country dimmed, like the landing card; the coordinates and "tracked since" line is gone. A pencil button swaps it for a full-width `SearchBox` holding the current name, selected so typing replaces it. Results appear only once the text changes, so no geocoding request is made for the unchanged name. Picking one opens that city; Escape or blur keeps the current one.
- **Performance.** Switching variables blocked the main thread for 370 to 600 ms in the dev build (long tasks measured with a `PerformanceObserver`). Two causes: the y-axis tween between unrelated domains re-rendered the whole spaghetti chart on every frame for 180 ms, and the Recharts precipitation panel re-rendered although its data does not depend on the variable. `useAnimatedDomain` now jumps when its `resetKey` (the variable) changes. The panel is a memoized element, loaded with `next/dynamic` so Recharts leaves the dashboard's first bundle. After the fix, the same switches produced no long tasks (one of 54 ms for precipitation).

## P22. Run time and Refresh sit with the city, not in the top bar (2026-09-24)

Decided by the author.

- **Landing.** The "Updated 12:00 UTC · 08:00 local" chip sits left of Refresh in the overview card header, from 1024 px (`lg`) up; at tablet width it would squeeze the city name to a few words. The skeleton has a matching block. The chip is presentational (`issueTime`, `timeZone`, `now` as props), so the Theme Lab gallery shows it from the dump.
- **Dashboard.** The chip moved from the top bar to the right end of the city name line, followed by a Refresh button; on phones the pair wraps under the name, right-aligned. The top bar no longer carries anything city-specific.
- **Dashboard Refresh is never gated.** It refetches the city's active `latest` queries, which re-anchors the chart at the current slot. Unlike the landing card, the dashboard already refetches every 15 minutes, so a button enabled only on a stale chart would almost always be disabled. The server only calls the upstream sources when a newer run exists (P19), so an ungated button costs nothing upstream.

## Open: the design decision (guide phase 2.5)

Not made yet. Base tokens are preset A (Sky). To decide: run `pnpm dev`, open the Lab (Ctrl/Cmd+Shift+T) on `/theme-lab`, a live city dashboard and the landing overview, star favourites, then `Copy CSS` into `globals.css` and record the choice and the runners-up with screenshots here.

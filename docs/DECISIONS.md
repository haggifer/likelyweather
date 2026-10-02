# Decisions

The choices made while building the prototype (from 2026-09-23), including every place it deliberately departs from the target architecture in the [README](../README.md#target-architecture), and what it would take to converge. Each entry says what was decided, why, and what was rejected where that matters. Entries P1 to P28 describe the single-app prototype and keep its paths: `src/shared` is now `packages/shared/src`, `src/charts` is `packages/charts/src`, `src/server` is `packages/server/src`, and the rest of `src` is `apps/web/src`.

## P1. One Next.js app instead of the pnpm + Turborepo monorepo (superseded by P29)

The prototype is a single Next.js 16 app so it runs with `pnpm dev` and nothing else. The target's packages map onto folders:

| Target                | Prototype                                                                          |
| --------------------- | ---------------------------------------------------------------------------------- |
| `packages/shared`     | `src/shared` (zod contract, model palette, variables, ensemble math, time helpers) |
| `packages/charts`     | `src/charts` (D3 hero charts, Recharts wrappers, `theme.ts`)                       |
| `packages/ui` presets | `src/theme`                                                                        |
| `apps/api`            | `src/app/api/**/route.ts` + `src/server`                                           |
| `apps/collector`      | `src/server/collector.ts` + `scripts/collect.ts`                                   |
| `packages/db`         | `src/server/store.ts` (see P3)                                                     |

Converging: move each folder into its package; imports already go through `@/shared`, `@/server`, `@/charts`.

## P2. Next.js route handlers instead of Express 5 on Lambda (superseded by P32)

Same REST paths, same zod schemas (`src/shared/api.ts`), same `{error: {code, message}}` shape, same `Cache-Control: public, max-age=300` on public reads and the same per-IP rate limits (120 reads/min, 30 geocode/min, 10 tracks/h). `src/server/http.ts` is the thin handler wrapper; moving to Express is a mechanical port of each `route.ts`.

## P3. JSON files instead of Postgres and S3 (superseded by P30)

Docker was not running on the build machine and the prototype should run without it. `src/server/store.ts` keeps the target's table shapes: `data/cities.json` (City), `data/runs.json` (CollectionRun), `data/forecasts/<cityId>/<issueTime>.json` (Forecast rows in columnar form per run and city), `data/raw/<runId>/*.json` (the S3 raw archive). Read-modify-write cycles take a cross-process file lock so the collector CLI and the dev server never interleave. `/api/runs/:id/archive` returns the raw JSON directly instead of a presigned URL.

Converging: implement the same exported functions with Prisma; nothing above `store.ts` changes.

## P4. In-process cache instead of Redis (superseded by P31)

`src/server/cache.ts` stands in for Redis with the same key names and TTLs: the geocode cache (24 h), fixed-window rate limits and request de-duplication. The previous-runs cache went with P20. The target's preview and `/latest` payload caches have no stand-in; the file store and de-duplication cover them locally. State lives on `globalThis`, so it is per process, which is exactly why the target uses Redis across Lambda instances; that is acceptable for a single local process. The collector lock is a lock file with a 10-minute expiry (`acquireJobLock`), the equivalent of `SET lock:collector NX EX 600`.

## P5. Evolution from Open-Meteo's Previous Runs API (removed, see P20)

The Previous Runs API (`previous-runs-api.open-meteo.com`) returns, for any location, each model's forecast from the runs issued 1 to 7 days before every hour, for the nine Open-Meteo models, back to early 2024 (verified on 2026-09-23, about 7 s per request). The evolution view uses it, so it works on day one for any city:

- It shows 8 daily issue offsets (7 days before to latest) instead of the last 16 six-hourly issue times.
- MET Norway has no archive, so it does not appear in the evolution view.
- Responses are cached for 3 hours.

Until 2026-09-24 the same API also fed a scoreboard (truth from the models' own analyses, MAE, bias and RMSE per lead bucket). It was removed with the MVP scope change in P17.

Converging: once the collector has stored enough runs, evolution can read the app's own runs at 6-hourly resolution and keep the Previous Runs data as a backfill (`origin = IMPORT`).

## P6. Hourly fetch aggregated to the 6-hour grid (superseded by P26)

The Python collector this project grew out of used `temporal_resolution=hourly_6`, where precipitation at a step is the one-hour amount (its notes flag the undercount). The prototype fetches hourly data and aggregates on the server: instant variables are sampled at 00/06/12/18 UTC and precipitation is the six hours ending at the step. met.no precipitation uses `next_6_hours` of the entry six hours earlier (or the six `next_1_hours` blocks), so met.no joins the precipitation panel on the same basis. A sum with any missing hour is null rather than an undercount.

## P7. A view refreshes a stale city (local stand-in for the scheduler)

There is no EventBridge locally. When `/latest` is requested and the newest snapshot predates the current 6-hour grid, the city is refreshed through the collector's code path with origin `PREVIEW`, de-duplicated so parallel requests share one upstream call. `pnpm collect` is the scheduled path for all active cities (with dormancy, the queue and the lock); `pnpm collect --loop` keeps running it every 6 hours. "Preview" in the UI means the city has no scheduled run yet.

## P8. Ensemble statistics and disagreement labels are derived on the client

Following the `api-design` rule (return raw data, derive on the client), `/latest` returns the raw series per model and the client computes median, quartiles, min–max, the disagreement tiles, median wind direction and chance of rain with the pure functions in `src/shared/ensemble.ts` (unit-tested). The disagreement thresholds live in `src/shared/variables.ts`, a shared module, so the planned exception (`disagreement.label` from the server) is not needed.

## P9. Model palette and colour-vision safety

The model palette is fixed and never reassigned. Running the dataviz validator on it: lightness and contrast pass, but ECMWF IFS (`#1D4ED8`) and ECMWF AIFS (`#7C3AED`) are only ΔE 3.4 apart for protanopes and 13.0 for normal vision, and met.no's `#475569` reads as gray. The colours stay; AIFS (dash `6 3`) and met.no (dash `2 3`) get a dash pattern as secondary encoding everywhere a model line or swatch appears, and every chart has a legend, a hover highlight and a table view.

## P10. Locale in a cookie, not the URL

`next-intl` runs without i18n routing: the language switch sets `NEXT_LOCALE` and refreshes. City names come from the geocoder in both languages (`nameLocal.uk`). Moving to locale-prefixed URLs needs a `[locale]` segment and the next-intl proxy.

## P11. Theme Lab never ships (removed, see P25)

`Providers.tsx` imports the lab with `next/dynamic` inside a branch on the inlined literal `process.env.NEXT_PUBLIC_THEME_LAB === '1'`; with `0` the branch is dead and no chunk is emitted. `pnpm check:no-lab` greps `.next/static` for a string that only exists in the panel; verified failing on a lab-on build and passing on a lab-off build. Candidate fonts are declared with `preload: false`, so a browser only downloads the ones a combination uses. `/theme-lab` calls `notFound()` when the flag is off.

## P12. Smaller choices

- shadcn/ui with the Radix base (`radix-nova`). The surface axis restyles every `[data-slot=card]` from `globals.css`; status chips and the source line live in `@layer components` so utilities can still hide them.
- Country flags are the MIT-licensed `country-flag-icons` 3×2 SVGs copied into `public/flags` (`pnpm flags`).
- TanStack Table is pinned to v8; v9 was current on npm with a new API.
- Redux owns filter state; `useUrlSync` hydrates it from the URL once per page (queries wait for that), then mirrors Redux back into the URL with nuqs.
- `useNow` returns null during server rendering and hydration, so the "now" line never causes a hydration mismatch.

## P13. Landing: median overview, in-place city selection, no header search, no "popular now"

Decided by the author on 2026-09-23 after the first review.

- The landing chart is no longer a spaghetti preview (that belongs to the dashboard). It shows the median of all models for temperature, wind speed (with median direction arrows), pressure and precipitation as four panels on one time axis, with day lines and a crosshair that drives the readouts. Per-model detail on hover is intentionally not built yet. The grid, the time window and the now line changed on 2026-09-24: see P18 and P19.
- The search box moved out of the header; the landing page is the search hub. Choosing a search result or a "Start with" chip keeps the user on the landing page and switches the overview (`?city=` keeps it linkable); "Open details" goes to the dashboard. A city not yet tracked is still tracked on selection, because the overview needs its forecast.
- "Start with" is New York, London, Paris, Kyiv. Paris was added to the seed cities; the store merges any missing seed on read.
- "Popular now" was removed as more than the MVP needs, together with `GET /api/cities/popular`.
- The wordmark is stacked on two lines next to a 32 px icon. Evaluated as a good move once the header lost the search box: it gives the brand more presence without widening the bar, and it still fits the compact 48 px density.

## P14. Five UI languages

Ukrainian, English, Spanish, German and French (`Locale` enum, `messages/*.json` with identical keys). The language menu lists each language by its own name. City names come from the geocoder per locale (`nameLocal`); country names come from `Intl.DisplayNames`, so they need no storage; region names stay in English. The Spanish, German and French catalogs are machine-drafted and should get a native review, as the Ukrainian one should.

## P15. Gridlines and day lines

A variable can declare a gridline step (`tickStep` in `src/shared/variables.ts`): 5 °C for temperature and 2 m/s for wind speed; the y domain snaps outward to that step (`src/charts/scales.ts`). Pressure keeps automatic ticks. Precipitation declares a ladder of steps instead (`tickSteps`: 0.5, 1, 2, 5, 10, 20, 25, 50 mm; 25 was added on 2026-09-24 so a 60–75 mm outlier gets an axis to 75 rather than 100): the domain starts at 0 and uses the smallest step that reaches the maximum in at most three segments. Both sources report 0.1 mm amounts, so 0.5 mm is the finest step that reads cleanly, and a dry forecast shows exactly two ticks, 0 and 0.5. This was decided on 2026-09-24; before, automatic ticks produced labels like 0, 0.0, 0.0, 0.1. Every time chart draws day boundaries the same way (`DayGrid`): a solid hairline at the city's local midnight, with the day label centred in the day. The precipitation panel (Recharts, categorical axis) draws the boundary before the first 6-hour total of each new local day.

## P16. The Theme Lab never fetches (removed, see P25)

The gallery (`/theme-lab`) renders a static dump of real API payloads, `src/fixtures/lab-dump.json` (city, and the 6-hour and hourly `latest` payloads for all four variables), captured with `pnpm lab:dump` through the same server code the API uses, without writing to the store. Gallery components are presentational and receive data as props; the capture time is used as "now" so the charts stay stable. The gallery and the dump load only behind `NEXT_PUBLIC_THEME_LAB`, `pnpm check:no-lab` also looks for them, and `outputFileTracingExcludes` keeps fixtures and `data/` out of server traces.

## P17. MVP scope: forecasts only (2026-09-24)

Decided by the author: comparing forecasts with what actually happened is a separate feature, not part of the MVP. Removed from the prototype:

- the scoreboard (`/city/[slug]/scoreboard`, `GET /api/cities/:slug/scoreboard`), the model detail page (`/models/[id]`, `GET /api/models/:id`), and the skill maths (`src/server/skill.ts`: consensus and self-analysis truth, MAE, bias, RMSE, hit rate, lead buckets, sample thresholds);
- the 30-day MAE column in the dashboard legend, the truth line and truth figure in the evolution view, the "Score the models" landing tile, and the truth and skill sections of the methodology;
- the scoreboard filters in Redux and the URL (`window`, `mode`, `lead`).

Kept at the time: the dashboard, evolution (removed later the same day, see P20), compare, runs, cities, methodology and the Theme Lab. The landing title now reads "Compare weather forecasts for your city". Truth, skill and the scoreboard move to a post-MVP phase, and the skill-job Lambda and its tables leave the MVP. `GET /api/models` stays as plain model metadata.

## P18. Landing overview on local 3-hour slots

Decided by the author on 2026-09-24. The overview shows 72 hours in 3-hour slots on the city's local clock (00, 03, 06…), starting at the slot the data arrived in. The city dashboard kept the 6-hour UTC grid until P21.

- Each snapshot now also stores the run on an hourly grid (`Snapshot.hourly`, from 12 h before the issue time to 96 h after). The collector parses the same upstream responses twice, so no extra requests are made. Snapshots stored before this change have no hourly grid and are refreshed once on the next view.
- `GET /api/cities/:slug/latest?resolution=hourly` returns that grid; the default stays the 6-hour grid. Following the API rule in P8, the client builds the slots (`src/shared/slots.ts`) with the same resampler the server uses (`src/shared/resample.ts`, moved to `shared`).
- Instant values are read at each slot. A precipitation slot is the amount of the 3 hours after it, so the first readout of a fresh chart is the coming 3 hours, and its bar is drawn to the right of the slot.
- Slots stay on whole UTC hours, where the hourly data is. A half-hour time zone (India, for example) gets slots at :30 local. Slots are evenly spaced, so after a DST change inside the window the later slots sit one hour off the local marks until the next refresh.
- MET Norway publishes hourly values only for about the first 60 hours; later slots take the median of the other models.
- The readout summaries cover the next 24 hours instead of four days. The chart already shows three days, and "today and tonight" is the more useful glance on the main screen; the dashboard is one click away.
- Layout: four panels, each on a very light rounded background (`--chart-grid` at 40 percent, 4 px radius) so they read as separate charts, with a 14 px gap matching the readouts on the left. Day lines, past shading, the now line and the crosshair are drawn per panel. Tick labels sit on the left and day labels below the last panel; the strip above the first panel shows the hovered slot's time at the crosshair. The loading skeleton is built from the same row layout and header height, so it matches the loaded card to the pixel (checked in the gallery, which shows both). The run and model-count line under the city name was removed; the region and country follow the city name in muted text.

## P19. The overview is anchored when the data arrives; Refresh

The overview starts at the slot the data arrived in, so on arrival "now" is the start of the chart and no now line is drawn. The hourly queries never refetch in the background, because that would silently re-anchor the chart. Once the current time moves into a later slot the chart is stale: the now line and the past shading appear and the Refresh button is enabled. Refresh refetches the four hourly payloads and re-anchors the chart. While it is disabled, a tooltip says "Already up to date"; it hangs on a focusable wrapper, because a disabled button receives no pointer events.

Refresh does not hit the upstream sources harder: the server only calls Open-Meteo and met.no when a new 6-hour run exists, and concurrent refreshes are de-duplicated. Gating the button in the UI is about a sensible interaction, not the protection.

## P20. No evolution view; variable switch in the body; tiles beside the overview (2026-09-24)

Decided by the author, checked before removing.

- **Evolution removed.** Run-to-run charts of one hour's forecast are the "dprog" charts of forecaster and enthusiast sites. Mainstream weather apps do not have them, and reading them needs the ideas of model runs and lead time. Removed:
    - `/city/[slug]/evolution`, `GET /api/cities/:slug/evolution` and `/steps`;
    - `src/server/evolution.ts` and the Previous Runs source (`src/server/sources/previousRuns.ts`, `OPEN_METEO_PREVIOUS_RUNS_BASE`), so the MVP no longer calls that API;
    - the evolution chart and view, its gallery section and dump entry, and the methodology section;
    - the `filters` slice. The URL-hydrated flag moved into the `dashboard` slice, and `useUrlSync` now mirrors only `?v=`.

    It may return as part of post-MVP accuracy; the code is in the history (P5).

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
- **Dashboard.** The chip moved from the top bar to the right end of the city name line, followed by a Refresh button; on phones the pair wraps under the name, right-aligned. The top bar no longer carries anything city-specific. The chip is as tall as the buttons beside it (28 px), and so are the preview and status chips on that line.
- **Dashboard Refresh is never gated.** It refetches the city's active `latest` queries, which re-anchors the chart at the current slot. Unlike the landing card, the dashboard already refetches every 15 minutes, so a button enabled only on a stale chart would almost always be disabled. The server only calls the upstream sources when a newer run exists (P19), so an ungated button costs nothing upstream.

## P23. Precipitation is hovered as a period (2026-09-24)

Asked by the author. A precipitation bar is a total over a span, so hovering it now selects the span, not an instant.

- **Dashboard chart (D3).** The pointer selects the bar whose span it is over (`getSpanIndex`). Before, it snapped to the nearest slot time, which sits on a bar's edge, so the right half of a bar selected the next one. The hovered span is shaded across the plot instead of drawing a crosshair line. The label above the plot, the legend readout and the compare tooltip read "Sat 03:00–06:00" (`formatPeriodLabel`). Stepping with the arrow keys stays on drawn bars.
- **Precipitation panel (Recharts).** Recharts already shades the hovered category (`Tooltip` `cursor`); its tooltip now names the 6-hour period instead of the hour it ends.

## P24. The dashboard chart is titled by its variable (2026-09-24)

Decided by the author. The chart card's title is the variable name alone ("Temperature"); the model count and the "Run 24 Sept, 12:00 UTC · on-demand preview" line are gone. The run time is already in the Updated chip on the city line, the model count in the legend, and preview status in its own chip. The legend's header row keeps the height of its "Show all" button, so the button no longer shifts the list when it appears.

## P25. The design is frozen and the Theme Lab is removed (2026-09-24)

Decided by the author: the current design stays. That is preset A (Sky) in light and dark, comfortable density, elevated cards, filled status chips, Inter with JetBrains Mono, and the legend beside the dashboard chart. `globals.css` now states these directly instead of switching them on `<html>` data attributes, and the eight candidate fonts are gone from the layout.

Removed: `src/theme` (tokens, presets, the lab panel and provider), `/theme-lab` and its gallery, `src/fixtures/lab-dump.json`, `pnpm theme:export`, `pnpm lab:dump`, `pnpm check:no-lab`, `NEXT_PUBLIC_THEME_LAB`, the Redux `layout` slice (legend placement and the lab's open state), and the hidden source line under charts. The color-mode helpers moved to `src/lib/colorMode.ts`. The lab is in the history (up to the parent of the commit "refactor(theme): freeze the current design and remove the theme lab") if a redesign needs it.

## P26. One hourly grid per run; no past hours (2026-09-24)

Decided by the author: no chart uses a 6-hour grid or the past 24 hours any more, so the stored run keeps neither.

- **Storage.** A snapshot is one hourly grid from 3 hours before the issue time to 108 hours after it (112 steps), replacing the 6-hour grid (24 hours back, 21 steps) and the hourly grid that started 12 hours back. Three early hours are the minimum: a chart starts at the local 3-hour slot the data arrived in, and that slot can begin up to 2 hours before the issue time. Snapshots in the old shape are refreshed once on the next view. Run row counts on `/runs` now count hourly values.
- **API.** `GET /latest` returns that grid; the `resolution` parameter is gone (a request that still sends it gets a 400).
- **Compare** uses the dashboard's time model: each city's chart starts at its local 3-hour slot of arrival and covers 96 hours, with a now line once a slot old. `toSlotLatest` in `src/shared/slots.ts` re-grids a payload for both.
- **Charts** draw a precipitation bar over the 3 hours after its slot only; the alternative alignment for sums ending at a 6-hour step is gone.
- **Where 6 hours remain.** Runs are still issued every 6 hours (00, 06, 12, 18 UTC), and the dashboard's precipitation panel still shows 6-hour totals counted from the chart start, because 3-hour bars leave no room for its hour and chance-of-rain labels.
- **Nothing needs the past hours.** The truth, skill and evolution features that used analysis hours were removed with P17 and P20; post-MVP accuracy would score stored future hours against later observations.

## P27. A daily quota per user, shown in the header (2026-09-24)

Asked by the author: a strict daily limit per user, visible in the header, sized for about ten users.

- **What counts.** One unit per upstream request the server makes on a client's behalf: refreshing a city when a newer run exists (or fetching a new city), and a geocoding search the 24-hour cache cannot answer. Reading stored forecasts is free, and concurrent views of one city share a single refresh, paid by the first. The scheduled collector does not spend user quota.
- **Limits.** 60 per client per UTC day, and 600 per day for the whole app. Worst case, if Open-Meteo counts every model as its own variable (8 variables × 9 models ≈ 7 calls per city), 600 refreshes are about 4,300 calls, under the free tier's 10,000 per day and 5,000 per hour, with room for the collector. The per-client limit covers browsing ten cities after each of the four daily runs plus some searches.
- **When it runs out.** A city with a stored snapshot is served as stored (the Updated chip shows its age); a city with none, or a new search, gets a 429 `quota_exceeded` that says when it resets.
- **Who a client is.** The first `x-forwarded-for` address, the key the rate limits already use. A client can forge that header, so in the target it must come from the CDN (CloudFront's viewer address); without accounts, IP is the only identity. Counters live in `src/server/cache.ts`, so they reset when the prototype's process restarts; in the target they are Redis keys with a TTL to midnight UTC.
- **Header meter.** `GET /api/quota` returns `{limit, used, resetsAt}`; the meter shows requests left as a bar and a count (the label hides on phones), turns amber at 20 percent, and its tooltip explains what counts and when it resets in the viewer's time. The client refetches it whenever a `latest`, `compare` or `geocode` query or a mutation settles (`makeQueryClient`).

## P28. Phone layout (2026-09-24)

Left open by the author and decided during implementation. Measured at 375 × 812 before the change: no page scrolled sideways, but the landing overview's chart was 101 px wide next to its readout column, the overview title had about 110 px beside its two buttons, the header ran 14 px into its padding once the quota meter arrived, 11 of the 16 chance-of-rain labels in the precipitation panel touched, and the model legend took 432 px.

- **Landing overview.** Below `sm` (640 px) the readouts form a 2 × 2 grid above a full-width chart (309 px at 375), and each panel carries its name and unit in its top-left corner, since the readouts no longer sit beside the panels. The skeleton follows the same layout. The card's buttons move under the city name.
- **Touch.** Charts take `touch-action: pan-y`, so a vertical swipe scrolls the page and a horizontal drag scrubs the chart; a tap selects the slot under the finger. On coarse pointers the header buttons and the variable switch grow to 36 px.
- **Variable switch.** Phones show only the selected variable's name next to the icons, so the current choice is readable without a hover title.
- **Header.** The quota meter drops its bar and label on phones and shows the count only.
- **Precipitation panel.** When a 6-hour window gets less than 28 px, every other hour and chance label is shown; the tooltip still has every window.
- **Legend.** Two columns while it sits under the chart (tablets), one beside it from `lg`. On phones it stays one column: the 36 px rows are the touch targets. (superseded by P37)
- **Unchanged.** Data tables (cities, runs) scroll sideways inside their own container, which suits tables of that width; compare already fitted. (superseded by P37)

## P29. The monorepo (2026-09-26)

The prototype converged on the target layout: `apps/web`, `apps/api`, `apps/collector`, and `packages/shared`, `ui`, `charts`, `db`, `fixtures`.

- **`packages/server` is an addition to the target layout.** The API's preview path and the collector run the same code (sources, collector, store, cache, quota, archive). Putting it in one package keeps both apps thin entry points; the alternative, one app importing the other, would couple two deployables.
- **Packages ship TypeScript source**, with explicit `exports`: Next.js transpiles them (`transpilePackages`), `tsx` runs them in development, esbuild bundles them for Lambda, and Vitest reads them directly. There is no per-package build step except `prisma generate`. A new file in `ui` or `charts` needs an `exports` entry.
- **Imports inside a package are relative**; the `@/` alias exists only in `apps/web`, because another package's tsconfig paths do not apply when it is imported.
- **Tailwind** scans `packages/ui` and `packages/charts` through `@source` in the web app's `globals.css`.
- **`apps/web/AGENTS.md`** holds the block `next dev` maintains; the repository rules stay in the root `AGENTS.md`.
- **Line endings** are LF in the working tree (`.gitattributes`), matching Prettier.

## P30. Postgres schema and partitions (2026-09-26)

- **Forecast** has one row per city, issue time, model and hour, and its primary key is that natural key: a partitioned table needs the partition key (`issueTime`) in every unique constraint, so the target's surrogate `id` was dropped. With one hourly grid (P26) the `grid` column went too.
- **Weekly RANGE partitions on `issueTime`**, Monday to Monday UTC. The init migration declares the partitioned table; `ensureForecastPartitions` creates the week of a write and the next one (once per week and process), and the scheduled run drops weeks older than `RETENTION_DAYS` (14) and their `Snapshot` rows. Runs are kept. Prisma sees no drift from the partitions (checked with `migrate diff`).
- **A `Snapshot` table** (city and issue time → run, origin, fetch time, met.no `Last-Modified`) replaces the prototype's per-file metadata, and says which run's rows are current when a scheduled run replaces a preview of the same issue.
- **Prisma 7 with the `pg` driver adapter everywhere.** Neon's pooled endpoint accepts ordinary TCP connections, so Docker, CI and Lambda share one adapter; the Neon-specific adapter was not needed.
- **City list writes** keep the prototype's read-modify-write shape, serialized by a transaction-scoped advisory lock; only changed rows are written.
- **Not created:** `GeocodeCache` (Redis is the cache; a miss simply asks the geocoder) and `Brief` (the optional phase 6 brief is not built).

## P31. Redis stays, but never on the critical path (2026-09-26)

Decided by the author after comparing it with a Postgres-only design: Redis stays, on Upstash's free plan only (no card, so no bill); ElastiCache, which bills a minimum even when idle, is never used.

- **Uses:** the geocode cache (24 h), the `/latest` payload cache (5 min, keyed by run id so a new run never serves a stale entry), fixed-window rate limits, the daily quota (one atomic Lua check-and-increment for the client and the app), and the collector lock (`SET NX EX`).
- **Fail-open.** Every Redis call has a one-second timeout and a fallback: no cache, no limit, lock granted. A refused or slow Redis costs latency, never availability. The collector's Lambda also runs with a concurrency of one, so a missing lock cannot double-run it.
- **Without `REDIS_URL`** the same interface runs in process memory; tests use that.
- Concurrent refreshes of one city are still de-duplicated in process; across Lambda instances a duplicate refresh writes the same run id and rows, so it only costs an extra upstream call.

## P32. Express REST API (2026-09-26)

- The Next.js route handlers became an Express 5 app with the same paths, zod schemas, error shape, cache headers and limits. Next.js forwards `/api/*` to it locally (`API_ORIGIN`); on AWS CloudFront routes `/api/*` before requests reach Next.js.
- **Client identity** comes from `CloudFront-Viewer-Address`; `X-Forwarded-For` is only trusted when that header is absent (local development).
- **Tracking a city no longer pre-fetches its preview in the background.** A Lambda function is frozen as soon as its response is sent, so background work would stall; the page's first `/latest` request fetches it.
- **Run archives** are one JSON document per run (the run plus every raw response), written to `RAW_DIR` locally or to S3 when `RAW_BUCKET` is set. The archive endpoint serves the document locally and redirects to a 10-minute presigned S3 URL on AWS, so the web app's link works in both.
- The city page's title reads the city list, not `/cities/:slug`, which records a view.
- The API is bundled with esbuild into one ESM file; the same bundle runs under Node locally (`pnpm --filter @fa/api start`) and behind the Lambda Web Adapter.

## P33. Collector app and CSV import (2026-09-26)

- `runScheduled` (lock, dormancy and queue promotion, collection, retention) is shared by the CLI (`pnpm collect`) and the Lambda handler. A FAILED run throws so EventBridge Scheduler retries it and the dead-letter queue raises the alarm; PARTIAL runs succeed.
- A run is stored before its snapshots, which reference it; if the process dies mid-write it stays FAILED.
- **`pnpm import:csv`**, not `pnpm import`: `import` is a built-in pnpm command (it converts another package manager's lockfile) and deleted `pnpm-lock.yaml` when first tried.
- The importer reads both header versions of the Python collector this project grew out of by column name, matches cities by coordinates within 0.05° (its CSVs spell "Odessa", the geocoder "Odesa"), takes the issue time from `issue_time` floored to 6 hours or from the file name, and keeps each 6-hourly row at its own valid time. Fixtures in `packages/fixtures/csv` are small hand-made files in the same formats.

## P34. End-to-end tests (2026-09-26)

- **Playwright** (`apps/e2e`) runs seven flows on a desktop and a phone profile: search and track a new city, open its dashboard, the "Start with" chips, the dashboard's variable switch with precipitation bars, compare, the language switch, and axe accessibility checks on the landing page and a dashboard (no serious or critical violations). They stand in for the guide's Lighthouse target.
- **A fake upstream** (`apps/e2e/fake-upstream.mjs`) replays the recorded New York responses for any location, shifted to today, and answers geocoding for one untracked city, so the collector and the preview path run for real and no test reaches Open-Meteo or met.no.
- **Its own database**: the suite migrates and seeds `<DATABASE_URL>_e2e` in a global setup, so fake forecasts never land in the development database. Its API keeps caches and the quota in memory and turns rate limits off (`DISABLE_RATE_LIMITS`), since every test comes from one address.
- **The production build** (`next start`) serves the web app, locally and in CI: closer to what ships, and Next.js 16 allows only one `next dev` per app.
- **`/api/*` forwarding moved from `next.config` rewrites to `apps/web/src/proxy.ts`.** Rewrites are fixed at build time, so a production build kept forwarding to the default API port; the proxy reads `API_ORIGIN` per request. The e2e suite found this, and also that `loadLocalEnv` replaced empty variables (an empty `REDIS_URL` meant "no Redis" but was overwritten from `.env`); it now only fills unset ones.
- **Fixed from the axe run:** the search box's `aria-controls` pointed at a result list that was not rendered while the box was empty; the list is now always mounted and hidden.
- **Not done: visual snapshots.** Baselines are platform-specific (fonts, antialiasing), so ones made on Windows would fail on the Linux runner. They should be generated on CI, for example with a manually triggered job that uploads them; the flows above already cover layout at both widths.

## P35. The web app runs on Lambda, not Amplify Hosting (2026-09-26)

Amplify Hosting documents Next.js support up to version 15, and Next.js 16 support is an open issue. The guide's fallback, Vercel, would add a second provider and account. Instead the web app runs like the API:

- `output: 'standalone'`, packaged by `apps/web/build-lambda.mjs` into `.next/lambda.zip` with the static assets copied in and an executable `run.sh`, behind the Lambda Web Adapter, as a third function in the one CDK stack. CloudFront sends pages to it uncached (they depend on the language cookie and the time), `/_next/static/*` to it with long edge caching, and `/api/*` to the API.
- **pnpm symlinks.** On Windows the standalone output links back to the repository's `node_modules`; the packager writes each link as a relative symlink to the traced copy inside the zip (6 MB, 64 MB unpacked). Checked by unzipping and running it in a `node:22-slim` container: pages return 200.
- **Why the zip is built by hand:** CDK zips assets without the execute bit on Windows, and the Web Adapter runs `run.sh`. The API's `lambda.zip` is made the same way.
- The city page title now comes from the slug (name and country code) instead of an API request, because the web function cannot call the IAM-protected API URL, and the CloudFront URL would be a circular reference in the stack.
- Your setup no longer needs Amplify.

## P36. The CDK stack (2026-09-26)

`infra/lib/forecast-arena-stack.ts`, verified with `cdk synth` and 7 template tests (no deploy yet):

- **Functions** (Node 22, arm64): web and API behind the Web Adapter (layer version 30) with IAM-authenticated function URLs reached only through CloudFront origin access control; the collector (`handler.handler`, 10 minutes, reserved concurrency 1, configurable to 0 for new accounts whose concurrency limit is still 10).
- **Secrets** stay in SSM Parameter Store under `/forecast-arena`; the functions get only `SSM_PREFIX` and read them on a cold start (`packages/server/src/secrets.ts`), because Lambda environment variables cannot reference SecureStrings.
- **POSTs through CloudFront** to an IAM-protected function URL need the body's SHA-256 in `x-amz-content-sha256`; the web client sends it (`apps/web/src/lib/api.ts`). The origin request policy must not list that header: CloudFront reserves it, rejects the policy (found on the first deploy) and uses the viewer's value when OAC signs.
- **CloudFront needs two permissions per function URL.** Function URLs created since October 2025 require `lambda:InvokeFunction` (with `lambda:InvokedViaFunctionUrl`) besides `lambda:InvokeFunctionUrl`; CDK's `FunctionUrlOrigin.withOriginAccessControl` (aws-cdk-lib 2.271) only grants the latter, so the stack adds the former for the web and API functions. Without it every request through CloudFront got 403 on the first deploy.
- **Schedule**: EventBridge Scheduler `cron(0 0/6 * * ? *)`, 2 retries within an hour, then an SQS dead-letter queue; alarms on collector errors and on the queue, e-mailed through SNS.
- **Storage**: a private, encrypted S3 bucket for run archives, Infrequent Access at 90 days, deleted at 400; logs kept 14 days.
- **Deploys**: a GitHub OIDC provider and a role only the repository's default branch can assume, allowed only to assume CDK's bootstrap roles; `.github/workflows/deploy.yml` runs once the role ARN is set as a repository variable.
- **Budget**: $5 a month, e-mail at 80 % actual and 100 % forecast. Template tests assert there is no VPC, NAT gateway, ElastiCache or RDS.
- Not done: `cdk diff` on pull requests (the deploy role is limited to the default branch), a custom domain.

## P37. Phone layout (2026-09-26)

Below 640 px (Tailwind `sm`) phones get their own layouts where the desktop ones did not fit; the layout at 640 px and wider is unchanged, while shorter day labels, the methodology model list and the sticky time column in the table view apply at every width. The frozen design (P25) stays: only layout, sizes and copy differ.

- **CSS switching.** Phone and desktop variants are chosen with `max-sm:` / `sm:` utilities (tables and their card lists are both rendered, one hidden), so server HTML matches the first client render. Touch copy uses `pointer-coarse:`. The runs table is the one exception: it is mounted only at 640 px and wider (`useMediaQuery`), because a virtualized table that is mounted while hidden has no size to measure; its card list still switches in CSS like everything else.
- **Dashboard.** A compact header, the variable switch pinned under the top bar, the model list inside the chart card in two columns, a swipeable row of disagreement tiles (a named, focusable `role="region"` so keyboards can scroll it), a sticky time column in the table view. The chart is 280 px high below 480 px of width.
- **Day labels** pick the longest form that fits ("Sat 26 Sept", "Sat 26", "Sat") instead of disappearing below a fixed width.
- **Runs and cities** are card lists on phones; run history shows 30 runs at a time.
- **Not done on purpose:** a bottom tab bar (it would promote secondary pages to the level of the forecast) and swiping between variables (it would fight touch scrubbing, P28).
- **Landscape phones** are usually wider than 640 px and get the tablet layout; a height-based phone layer was left out.

## P38. Code style: named exports, one hook per file, kebab-case modules (2026-10-01)

Decided by the author, applying their code-style rules to the whole repository in one change rather than file by file.

- **Named exports** for components, hooks, the Redux slice and every other module. A named export has one canonical name: an import can't silently rename it, a rename is caught by the compiler, and editor auto-imports agree. `export default` stays only where a framework requires it (Next.js pages, layouts and `not-found`, config files, next-intl's request config). Replaced: `export default function` components (the convention until now).
- **One hook per file** in `hooks/` folders (`apps/web/src/hooks`, `packages/ui/src/hooks`, `packages/charts/src/hooks`), each with an explicit return type; the TanStack Query hooks were split out of one `queries.ts`; the latest-forecast query options and timing live in `apps/web/src/lib/latest-query.ts`.
- **Module names say what they hold**: kebab-case for everything but components (PascalCase) and hooks (camelCase), and no catch-all module (`@fa/ui/lib/utils` became `@fa/ui/lib/cn`).
- **Static code at module scope**: anything in a component that reads no props, state or hook result moved out of the component body; types used by several files moved to the nearest `types.ts`.
- **Sizes in `rem`**: arbitrary Tailwind values and the design tokens in `globals.css` (base text 0.875rem, radius, row height, paddings, gaps, top bar), so the app follows the browser's font-size setting (WCAG 1.4.4) like the rest of Tailwind's scale. At the default 16 px they equal the frozen px values (P25); checked at a 20 px root on every page at 375 px with no overflow. Hairlines, shadows, SVG geometry and chart maths stay in pixels.
- **Not adopted from the same rules**, because earlier decisions say otherwise: Zustand (Redux Toolkit holds UI state: P12 and the State rule in AGENTS.md), antd and Bootstrap styling (Tailwind and shadcn/ui: P12, P25 and the UI kit rule), and an import alias inside packages (relative imports, P29).

## P39. Local time first, everywhere (2026-10-02)

Decided by the author: every time the UI shows is local first, and UTC appears only as hover text.

- **City times stay in the city's zone**, as the charts already were (P18, P21). The forecast chip on the dashboard and the landing overview no longer leads with UTC ("Updated 12:00 UTC · 08:00 local") or says "Stale" without saying what is old; see the age chip below. Dates on the cities page are in each city's zone too.
- **Times that belong to no city use the viewer's zone**: the runs page and the quota reset. The runs timeline puts the 00, 06, 12 and 18 UTC runs on the viewer's calendar (`apps/web/src/components/runs/timeline-grid.ts`): a column per local day, a row per run in local clock order, so a run that starts after local midnight sits in the next day's column. Row labels use today's offset; after a daylight-saving change, older squares sit an hour off their label, and their tooltips stay exact. The viewer's zone is read only after mount (the server renders in UTC), so these views render from client-side data.
- **Model runs are still named by UTC in the methodology copy** ("collected at 00, 06, 12 and 18 UTC"), because that is how the forecast centres publish them.
- **The forecast chip shows the run's age** ("19 hours old"), amber past 9 hours, with the run's city and UTC times in its tooltip. A clock time on the chip read as the viewer's own time (a New York run "from Thu 14:00" looked 7 hours off to a viewer in Kyiv); an age reads the same everywhere.
- **The now line is always drawn, at the exact current time** (overview, dashboard, Compare), with the past shaded and the readouts on the slot nearest to now. Before, it appeared only once the current time had moved into a later 3-hour slot than the one the chart starts at, on the idea that "now" is the chart start (P19, P21, P22). It is not: the chart starts at the beginning of the slot, so the current time can sit up to 3 hours in with no line. Refresh still enables only once the chart is a slot old.
- **Charts start where the data starts** (decided by the author on 2026-10-02): the overview, dashboard and Compare charts start at the local 3-hour slot the shown run was fetched in (the payload's `fetchedAt`), not the slot the browser received it in. Data fetched 19 hours ago gives a chart that starts 19 hours ago, with the past shaded up to the now line, and the chip's age counts from the same moment. This replaces the arrival anchor of P19, P21 and P22. A refetch moves the chart only when it brings a newer run; the landing overview still refetches only on Refresh, so a newer run never replaces the chart under the reader.
- **The age chip and Refresh appear together, at 3 hours** (decided by the author on 2026-10-02, `REFRESH_AFTER_HOURS`): until the data on screen was fetched 3 hours ago there is no chip and Refresh is disabled, with a tooltip saying so; from then on the chip shows the age, rounded down, and Refresh is enabled, on the landing overview and the dashboard alike. The chip turns amber past 9 hours. Before, the landing Refresh turned on when the 3-hour slot changed and the dashboard's was always on.

## P40. Privacy policy and terms of use (2026-10-02)

Decided by the author: the two legal pages are adapted from the author's AdLens pages (Termly-generated, then edited), so both projects share one structure, contact e-mail and governing law. Neither page names a person or gives a postal address: the operator is "the operator of Forecast Arena", reachable by e-mail.

- **The facts are Forecast Arena's own.** No accounts, forms, uploads, analytics or AI. The only personal data is the IP address in the request counters (`ratelimit:*`, kept 1 minute or 1 hour, and `quota:*`, kept until 00:00 UTC), stored unhashed in Redis and never logged. City searches reach Open-Meteo from the server, not the browser. The browser keeps the `NEXT_LOCALE` cookie and the `fa.mode` theme in local storage. The service providers are AWS, Upstash and Neon, all in Frankfurt. AdLens's sections on accounts, social logins, uploads, AI and its Termly request form were dropped. The terms add that forecasts are model output, not for safety decisions, and that the weather data stays under its providers' CC BY 4.0 license.
- **English only.** The texts are MDX (`apps/web/src/content/legal`, through `@next/mdx`), styled by `src/mdx-components.tsx` with token classes because the app has no typography plugin. The page around them follows the chosen language and says the document is in English.
- **Keep them true.** A change to what the app stores, logs or shares, its cookies, or its providers (including a custom domain, which replaces the CloudFront URL in both texts) updates these pages and their "last updated" date in the same commit.

## P41. Grouped bodies, one line per value (2026-10-02)

Decided by the author, extending P38 with two rules added to their `js-ts-code-style` and `writing-react-code` skills.

- **Bodies read in groups**, one blank line between groups and none inside one. A component or hook orders them: context and framework hooks, state and refs, queries, derived values, handlers, effects, then early returns and the JSX. Effects come last because a dependency array is built during render, so an effect listing a handler declared below it would read it before it is initialised. A value that a hook needs goes directly above that hook.
- **One line per derived value.** A computation longer than about three lines, including a `useMemo` body, becomes a named pure function at module scope or in a kebab-case module, so the body says what each value is and the function says how. A computation written in more than one place gets one tested home, such as `getChartStart` in `packages/shared/src/slots.ts`, which the overview, the dashboard and Compare share.

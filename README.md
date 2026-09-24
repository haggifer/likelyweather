# Forecast Arena (prototype)

Ten weather models for any city and how much they disagree. Public, no login. Measuring which model has been right is a separate feature planned after the MVP.

This is the functional prototype of the app described under [Target architecture](#target-architecture). It runs on live data from Open-Meteo and MET Norway with no database or Docker: a JSON file store and an in-process cache stand in for Postgres and Redis behind the same interfaces. Every departure from the target, and how to converge, is in [docs/DECISIONS.md](docs/DECISIONS.md).

## Run it

Needs Node 22 and pnpm.

```bash
pnpm install
cp .env.example .env.local   # then put a real contact in METNO_USER_AGENT
pnpm dev                     # http://localhost:3000
```

The eleven seed cities (`src/shared/seeds.ts`) are created on first start. Open any city and its forecast is fetched within a few seconds; search for any other city to start tracking it.

Optional: fill the store for every active city now, or keep a local 6-hourly schedule running.

```bash
pnpm collect                                  # one scheduled run, all active cities
pnpm collect -- --cities kharkiv-ua-706483    # just some cities
pnpm collect -- --loop                        # run now, then every 6 hours
```

## What works

| Screen         | Route                          | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Landing        | `/?city=`                      | Search (Ctrl/Cmd+K) and "Start with" chips (New York, London, Paris, Kyiv) switch the city in place; the overview shows the median of all models for the next 72 h in local 3-hour slots (temperature, wind speed with direction arrows, pressure, precipitation) with a synced crosshair and next-24-hour summaries; the run time sits beside Refresh, which is enabled once the chart is a slot old, together with a now line; "Open details" goes to the dashboard                                                                                                                                          |
| City dashboard | `/city/[slug]`                 | Back link, in-place city switcher, run time and Refresh; D3 spaghetti chart over 96 h in local 3-hour slots from arrival (now line once stale), min–max and interquartile bands, median, precipitation as median bars with per-model ticks, hovered as the 3-hour period each bar covers, hovered time above the chart, keyboard stepping; side list sorted by value; keys 1–9, 0 toggle models; disagreement tiles; precipitation panel (Recharts, lazy-loaded) with 6-hour totals from the chart start, per-model ticks and chance of rain; wind arrows; preview and stale badges; table view on every chart |
| Compare        | `/compare?cities=a,b`          | Up to four cities, shared axis                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Runs           | `/runs`                        | 30-day slot timeline, virtualized run history, raw archive per run                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Cities         | `/cities`                      | Tracked cities with status, views, scheduled runs                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Methodology    | `/methodology`                 | Sources, grids, median and spread, disagreement, limits, attribution                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Theme Lab      | `/theme-lab`, Ctrl/Cmd+Shift+T | Development only: 5 presets, every design axis (density, surface, radius, type, accent, chips, bands), live WCAG badges, favourites, A/B, shareable `?tl=` link, Copy CSS. The gallery renders a static dump of real API payloads (`src/fixtures/lab-dump.json`) and never fetches                                                                                                                                                                                                                                                                                                                             |

Ukrainian, English, Spanish, German and French (language menu in the top bar; the non-English catalogs are machine-drafted and need a native review), light and dark mode.

## Scripts

| Command                                        | What it does                                                                                                                                                  |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`                                     | Next.js dev server (Turbopack)                                                                                                                                |
| `pnpm build` / `pnpm start`                    | Production build and server                                                                                                                                   |
| `pnpm test`                                    | Vitest: ensemble math, resampling, local 3-hour slots, axis steps, met.no parser, theme resolve and contrast, chart geometry snapshot on a real collector run |
| `pnpm lint` / `pnpm typecheck` / `pnpm format` | ESLint, `tsc` after `next typegen`, Prettier with organize-imports                                                                                            |
| `pnpm collect`                                 | Collector (see above); holds a lock so two runs never overlap                                                                                                 |
| `pnpm seed [--force]`                          | Ensure (or reset) the seed cities                                                                                                                             |
| `pnpm theme:export [--preset metro]`           | Print the frozen `:root` / `.dark` CSS for a combination                                                                                                      |
| `pnpm lab:dump [--city slug]`                  | Re-capture the Theme Lab gallery dump from the live APIs (default Kyiv)                                                                                       |
| `pnpm check:no-lab`                            | After `NEXT_PUBLIC_THEME_LAB=0 pnpm build`: fail if the Theme Lab panel, gallery or dump is in the bundle                                                     |
| `pnpm flags`                                   | Re-copy the SVG country flags into `public/flags`                                                                                                             |

## Architecture

```
Browser ── TanStack Query ──▶ /api/* (Next route handlers, zod-validated, rate-limited)
                                 │
                                 ├─ geocode ───────────▶ Open-Meteo Geocoding (cached 24 h)
                                 ├─ latest / compare ──▶ snapshot store (6-hour and hourly grids); stale → collector preview path ─▶ Open-Meteo + met.no
                                 └─ runs / cities / health ─▶ JSON store (data/)

pnpm collect ─▶ collector (batched Open-Meteo, paced met.no, lock, dormancy) ─▶ data/forecasts, data/runs.json, data/raw
```

```
src/
  app/            pages and /api route handlers
  server/         collector, sources (Open-Meteo, met.no, geocoding), store, cache, http
  shared/         zod API contract, model palette, variables, ensemble math, resampling, 3-hour slots, time helpers
  charts/         D3 hero charts, Recharts wrappers, chart theme reader
  components/     shell, landing, city, runs, cities, compare, gallery, shadcn ui
  store/          Redux Toolkit slices: dashboard, layout
  theme/          Theme Lab: tokens, presets, resolve, apply, contrast, storage, freeze, provider, panel
  hooks/          TanStack Query hooks, URL sync, time
  fixtures/       real collector snapshot for tests, Theme Lab dump
  i18n/, messages/ next-intl config and uk/en/es/de/fr catalogs
docs/             DECISIONS.md (design decisions), METHODOLOGY.md (grids, slots, ensemble maths)
```

## Target architecture

The prototype converges on this stack; the mapping of each piece is in DECISIONS P1 to P4.

- **Web:** Next.js App Router, Tailwind v4 and shadcn/ui with a token system and a development-only Theme Lab, Redux Toolkit for UI state, TanStack Query for server state, TanStack Table and Virtual, Recharts, D3 for the hero charts, next-intl (uk, en, es, de, fr). Hosted on Amplify.
- **API:** Express 5 REST on AWS Lambda (Web Adapter) behind CloudFront, with the same zod contract.
- **Data:** Prisma on Postgres (Neon) with forecasts partitioned by issue time; Redis (Upstash) for the geocode and preview caches, rate limits and the collector lock; an S3 archive of raw upstream responses.
- **Collector:** a scheduled Lambda function (EventBridge Scheduler, every 6 hours).
- **Infrastructure and tooling:** one AWS CDK stack; a pnpm and Turborepo monorepo (`apps/web`, `apps/api`, `apps/collector`, `packages/shared`, `packages/charts`, `packages/ui`, `packages/db`, `packages/fixtures`, `infra`); CI runs lint, typecheck, tests, the catalog check, end-to-end tests, the lab-off build and `cdk synth`.
- **Optional:** a daily Gemini Flash brief with a claim checker.

Not in the prototype yet: the monorepo split, Express on Lambda, Prisma and Postgres, Redis, S3, CDK, CI, Playwright, CSV import, the Gemini brief and `pnpm check:messages`. Truth, skill scores, the scoreboard and the evolution view are out of the MVP (DECISIONS P17, P20).

## Design decisions

The full log, with the rejected alternatives, is [docs/DECISIONS.md](docs/DECISIONS.md). The ones a newcomer is most likely to undo by accident:

- **Models are compared with each other, not with observations** (P17). Accuracy needs truth data and its own UI; it is a post-MVP feature.
- **The server returns raw series; the client derives everything** (P8). Medians, quartiles, slots, disagreement and labels are pure functions in `src/shared`, unit-tested and shared with the future API.
- **Charts are anchored to when the data arrived** (P18, P19, P21). They start at the local 3-hour slot of arrival, so "now" is the chart start; a background refetch would silently move the landing chart, so it only moves on Refresh.
- **Precipitation is a total over a span** (P18, P21, P23): bars, not lines, and hovered as the period each bar covers.
- **The Theme Lab never ships and never fetches** (P11, P16). A production build is checked with `pnpm check:no-lab`.
- **The model palette is fixed** (P9), with dash patterns where two colors are too close for color-vision deficiencies.

## Data and attribution

Weather data by [Open-Meteo.com](https://open-meteo.com/) (CC BY 4.0) and [MET Norway](https://api.met.no/) (CC BY 4.0). Geocoding by Open-Meteo (GeoNames). Non-commercial use. Flags from `country-flag-icons` (MIT).

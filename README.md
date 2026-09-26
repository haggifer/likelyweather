# Forecast Arena

Ten weather models for any city and how much they disagree. Public, no login. Measuring which model has been right is a separate feature planned after the MVP.

A pnpm and Turborepo monorepo: a Next.js web app, an Express REST API and a scheduled collector on Postgres (Prisma) and Redis, with an AWS CDK stack for Lambda, S3, EventBridge Scheduler and CloudFront. Live data comes from Open-Meteo and MET Norway. Every design decision, and every place the build departs from the [target architecture](#target-architecture), is in [docs/DECISIONS.md](docs/DECISIONS.md).

## Run it

Needs Node 22, pnpm and Docker.

```bash
pnpm install
cp .env.example .env      # then put a real contact in METNO_USER_AGENT
pnpm db:up                # Postgres 16 and Redis 7 in Docker
pnpm db:deploy            # apply the Prisma migrations
pnpm db:seed              # models and the eleven seed cities
pnpm dev                  # web on http://localhost:3000, API on http://localhost:4000
```

Open any city and its forecast is fetched within a few seconds; search for any other city to start tracking it. The web app forwards `/api/*` to the API, so the browser sees one origin.

Optional: fill the database for every active city now, keep a local 6-hourly schedule running, or load CSVs from the reference Python collector.

```bash
pnpm collect                                  # one scheduled run, all active cities
pnpm collect -- --cities kharkiv-ua-706483    # just some cities
pnpm collect -- --loop                        # run now, then every 6 hours
pnpm import:csv -- ./packages/fixtures/csv/*.csv
```

## What works

| Screen         | Route                 | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Landing        | `/?city=`             | Search (Ctrl/Cmd+K) and "Start with" chips (New York, London, Paris, Kyiv) switch the city in place; the overview shows the median of all models for the next 72 h in local 3-hour slots (temperature, wind speed with direction arrows, pressure, precipitation) with a synced crosshair and next-24-hour summaries; the run time sits beside Refresh, which is enabled once the chart is a slot old, together with a now line; "Open details" goes to the dashboard                                                                                                                                          |
| City dashboard | `/city/[slug]`        | Back link, in-place city switcher, run time and Refresh; D3 spaghetti chart over 96 h in local 3-hour slots from arrival (now line once stale), min–max and interquartile bands, median, precipitation as median bars with per-model ticks, hovered as the 3-hour period each bar covers, hovered time above the chart, keyboard stepping; side list sorted by value; keys 1–9, 0 toggle models; disagreement tiles; precipitation panel (Recharts, lazy-loaded) with 6-hour totals from the chart start, per-model ticks and chance of rain; wind arrows; preview and stale badges; table view on every chart |
| Compare        | `/compare?cities=a,b` | Up to four cities in local 3-hour slots over 96 h, shared axis                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Runs           | `/runs`               | 30-day slot timeline, virtualized run history, raw archive per run                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Cities         | `/cities`             | Tracked cities with status, views, scheduled runs                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Methodology    | `/methodology`        | Sources, grids, median and spread, disagreement, limits, attribution                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

A daily quota per user (60 new forecast requests, see DECISIONS P27) is shown as a meter in the top bar.

Ukrainian, English, Spanish, German and French (language menu in the top bar; the non-English catalogs are machine-drafted and need a native review), light and dark mode.

## Scripts

| Command                                               | What it does                                                                       |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `pnpm dev`                                            | Starts the Docker services, then the API (`tsx watch`) and the web app (Turbopack) |
| `pnpm db:up` / `db:deploy` / `db:migrate` / `db:seed` | Docker services; apply migrations; create a new migration; seed models and cities  |
| `pnpm build`                                          | Next.js build, API and collector Lambda bundles (esbuild), Prisma client           |
| `pnpm test`                                           | Vitest in every package; database tests run when `DATABASE_URL` is reachable       |
| `pnpm lint` / `typecheck` / `format` / `format:check` | ESLint, TypeScript, Prettier with organize-imports                                 |
| `pnpm collect`                                        | Scheduled collector run (see above); holds a Redis lock so two runs never overlap  |
| `pnpm import:csv -- <files>`                          | Import reference-collector CSVs (`.csv` or `.csv.gz`) as IMPORT runs               |
| `pnpm --filter @fa/web flags`                         | Re-copy the SVG country flags into `apps/web/public/flags`                         |

## Architecture

```
Browser ── TanStack Query ──▶ /api/* ──▶ Express REST (zod-validated, rate-limited, per-client quota)
                                            │
                                            ├─ geocode ───────────▶ Open-Meteo Geocoding (Redis cache 24 h)
                                            ├─ latest / compare ──▶ Postgres snapshot; stale → preview fetch ─▶ Open-Meteo + met.no
                                            └─ runs / cities / health ─▶ Postgres; run archive in RAW_DIR or S3

collector (CLI or scheduled Lambda) ─▶ Redis lock ─▶ batched Open-Meteo, paced met.no ─▶ Postgres (weekly partitions) + raw archive
```

## Layout

```
apps/
  web/            Next.js pages, components, TanStack Query hooks, Redux slices, next-intl catalogs
  api/            Express app: routes, rate limits, error shape; bundled for Lambda
  collector/      collector CLI, Lambda handler, CSV import
packages/
  shared/         zod API contract, model palette, variables, ensemble maths, resampling, 3-hour slots, formatting
  server/         domain code shared by the API and the collector: store, cache, quota, collector, sources, archive
  db/             Prisma schema, migrations (weekly Forecast partitions), seed, partition maintenance
  ui/             shadcn components, color mode, generic hooks
  charts/         D3 hero charts, Recharts wrappers, chart colors read from the CSS tokens
  fixtures/       real upstream responses, a collector snapshot and reference CSVs for tests
docs/             DECISIONS.md (design decisions), METHODOLOGY.md (grids, slots, ensemble maths)
```

## Target architecture

What is built and what is still planned; the choices behind each piece are in DECISIONS P29 onwards.

- **Web:** Next.js App Router, Tailwind v4 and shadcn/ui with a token system, Redux Toolkit for UI state, TanStack Query for server state, TanStack Table and Virtual, Recharts, D3 for the hero charts, next-intl (uk, en, es, de, fr). Hosted on Amplify.
- **API:** Express 5 REST on AWS Lambda (Web Adapter) behind CloudFront, with the same zod contract.
- **Data:** Prisma on Postgres (Neon) with forecasts partitioned by issue time; Redis (Upstash) for the geocode and preview caches, rate limits and the collector lock; an S3 archive of raw upstream responses.
- **Collector:** a scheduled Lambda function (EventBridge Scheduler, every 6 hours).
- **Infrastructure and tooling:** one AWS CDK stack; a pnpm and Turborepo monorepo (`apps/web`, `apps/api`, `apps/collector`, `packages/shared`, `packages/charts`, `packages/ui`, `packages/db`, `packages/fixtures`, `infra`); CI runs lint, typecheck, tests, the catalog check, end-to-end tests, the build and `cdk synth`.
- **Optional:** a daily Gemini Flash brief with a claim checker.

Built and running locally: the monorepo, Express, Prisma and Postgres with partitions, Redis, the collector with its Lambda handler, the S3 archive path and the CSV import. Not yet: the CDK stack and deployment, CI, Playwright, `pnpm check:messages` and the Gemini brief. Truth, skill scores, the scoreboard and the evolution view are out of the MVP (DECISIONS P17, P20).

## Design decisions

The full log, with the rejected alternatives, is [docs/DECISIONS.md](docs/DECISIONS.md). The ones a newcomer is most likely to undo by accident:

- **Models are compared with each other, not with observations** (P17). Accuracy needs truth data and its own UI; it is a post-MVP feature.
- **The server returns raw series; the client derives everything** (P8). Medians, quartiles, slots, disagreement and labels are pure functions in `packages/shared`, unit-tested.
- **Charts are anchored to when the data arrived** (P18, P19, P21). They start at the local 3-hour slot of arrival, so "now" is the chart start; a background refetch would silently move the landing chart, so it only moves on Refresh.
- **Precipitation is a total over a span** (P18, P21, P23): bars, not lines, and hovered as the period each bar covers.
- **The design is frozen in `globals.css`** (P25). The Theme Lab that chose it was removed; it is in the history if a redesign needs it.
- **Redis is never on the critical path** (P31). Upstash's free plan only; any Redis error means no cache, no limit and no lock for that call, never an outage or a bill.
- **One hourly grid per run, weekly partitions** (P26, P30). Forecast rows are partitioned by issue week and dropped after 14 days by the scheduled run.
- **The model palette is fixed** (P9), with dash patterns where two colors are too close for color-vision deficiencies.

## Data and attribution

Weather data by [Open-Meteo.com](https://open-meteo.com/) (CC BY 4.0) and [MET Norway](https://api.met.no/) (CC BY 4.0). Geocoding by Open-Meteo (GeoNames). Non-commercial use. Flags from `country-flag-icons` (MIT).

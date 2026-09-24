# Forecast Arena (prototype)

Ten weather models for any city, how much they disagree, how each forecast changed as the hour approached, and which models have actually been right there. Public, no login.

This is the functional prototype of the app specified in [docs/PROJECT_GUIDE.md](docs/PROJECT_GUIDE.md). It runs on live data from Open-Meteo and MET Norway with no database or Docker: a JSON file store and an in-process cache stand in for Postgres and Redis behind the same interfaces. Every departure from the guide, and how to converge, is in [docs/DECISIONS.md](docs/DECISIONS.md).

## Run it

Needs Node 22 and pnpm.

```bash
pnpm install
cp .env.example .env.local   # then put a real contact in METNO_USER_AGENT
pnpm dev                     # http://localhost:3000
```

The ten seed cities are created on first start. Open any city and its forecast is fetched within a few seconds; search for any other city to start tracking it.

Optional: fill the store for every active city now, or keep a local 6-hourly schedule running.

```bash
pnpm collect                                  # one scheduled run, all active cities
pnpm collect -- --cities kharkiv-ua-706483    # just some cities
pnpm collect -- --loop                        # run now, then every 6 hours
```

## What works

| Screen | Route | Notes |
|---|---|---|
| Landing | `/` | Search (Ctrl/Cmd+K anywhere), popular and seed chips, live preview chart |
| City dashboard | `/city/[slug]` | D3 spaghetti chart with min–max and interquartile bands, median, now line, 6-hour hover snapping, keyboard stepping; side list sorted by value with 30-day MAE at 24 h; keys 1–9, 0 toggle models; disagreement tiles; precipitation panel (Recharts) with per-model ticks and chance of rain; wind arrows; preview and stale badges; table view on every chart |
| Scoreboard | `/city/[slug]/scoreboard` | Window 7/30/90 days, consensus or self-analysis truth, lead 24–96 h; TanStack ranking table with sparklines; D3 heatmap with hatched low-sample cells and a "why" popover listing the ten largest errors |
| Evolution | `/city/[slug]/evolution` | One valid time, each model's forecast from runs 0–7 days earlier, truth line, convergence strip |
| Model detail | `/models/[id]` | Bias over time and error by lead for the six most viewed cities, worst misses |
| Compare | `/compare?cities=a,b` | Up to four cities, shared axis |
| Runs | `/runs` | 30-day slot timeline, virtualized run history, raw archive per run |
| Cities | `/cities` | Tracked cities with status, views, scheduled runs |
| Methodology | `/methodology` | Truth and skill definitions, limits, attribution |
| Theme Lab | `/theme-lab`, Ctrl/Cmd+Shift+T | Development only: 5 presets, every axis from guide §4.6, live WCAG badges, favourites, A/B, shareable `?tl=` link, Copy CSS |

English and Ukrainian (language switch in the top bar), light and dark mode.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Next.js dev server (Turbopack) |
| `pnpm build` / `pnpm start` | Production build and server |
| `pnpm test` | Vitest: ensemble math, resampling, skill, met.no parser, theme resolve and contrast, chart geometry snapshot on a real collector run |
| `pnpm lint` / `pnpm typecheck` / `pnpm format` | ESLint, `tsc` after `next typegen`, Prettier with organize-imports |
| `pnpm collect` | Collector (see above); holds a lock so two runs never overlap |
| `pnpm seed [--force]` | Ensure (or reset) the seed cities |
| `pnpm theme:export [--preset metro]` | Print the frozen `:root` / `.dark` CSS for a combination |
| `pnpm check:no-lab` | After `NEXT_PUBLIC_THEME_LAB=0 pnpm build`: fail if the Theme Lab panel is in the bundle |
| `pnpm flags` | Re-copy the SVG country flags into `public/flags` |

## Architecture

```
Browser ── TanStack Query ──▶ /api/* (Next route handlers, zod-validated, rate-limited)
                                 │
                                 ├─ geocode ───────────▶ Open-Meteo Geocoding (cached 24 h)
                                 ├─ latest / compare ──▶ snapshot store; stale → collector preview path ─▶ Open-Meteo + met.no
                                 ├─ scoreboard / evolution / models ─▶ Open-Meteo Previous Runs API (cached 3 h) → truth & skill
                                 └─ runs / cities / health ─▶ JSON store (data/)

pnpm collect ─▶ collector (batched Open-Meteo, paced met.no, lock, dormancy) ─▶ data/forecasts, data/runs.json, data/raw
```

```
src/
  app/            pages and /api route handlers
  server/         collector, sources (Open-Meteo, met.no, geocoding, previous runs), skill, store, cache, http
  shared/         zod API contract, model palette, variables, ensemble math, time helpers
  charts/         D3 hero charts, Recharts wrappers, chart theme reader
  components/     shell, city, scoreboard, evolution, runs, cities, compare, gallery, shadcn ui
  store/          Redux Toolkit slices: dashboard, filters, layout
  theme/          Theme Lab: tokens, presets, resolve, apply, contrast, storage, freeze, provider, panel
  hooks/          TanStack Query hooks, URL sync, time
  i18n/, messages/ next-intl config and EN/UK catalogs
docs/             PROJECT_GUIDE.md, DECISIONS.md, METHODOLOGY.md
```

## Not in the prototype yet

Monorepo split, Express on Lambda, Prisma/Postgres with partitions, Redis, S3, CDK, CI, Playwright, the nightly skill job, CSV import, 6/12/18/36 h lead buckets, Gemini brief. See the build plan in guide §16 and the convergence notes in DECISIONS.md.

## Data and attribution

Weather data by [Open-Meteo.com](https://open-meteo.com/) (CC BY 4.0) and [MET Norway](https://api.met.no/) (CC BY 4.0). Geocoding by Open-Meteo (GeoNames). Non-commercial use. Flags from `country-flag-icons` (MIT).

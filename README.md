# Forecast Arena

Ten weather models for any city and how much they disagree. Public, no login. Measuring which model has been right is a separate feature planned after the MVP.

A pnpm and Turborepo monorepo: a Next.js web app and an Express REST API on Postgres (Prisma) and Redis, with an AWS CDK stack for Lambda and CloudFront. Live data comes from Open-Meteo and MET Norway. Every design decision, and every place the build departs from the [target architecture](#target-architecture), is in [docs/DECISIONS.md](docs/DECISIONS.md).

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

Open any city and its forecast is fetched within a few seconds; search for any other city to open it the same way. Nothing is collected on a schedule: a city's forecast is fetched when someone opens it and a newer 6-hour run exists (DECISIONS P46). The web app forwards `/api/*` to the API, so the browser sees one origin.

## What works

| Screen         | Route                 | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Landing        | `/?city=`             | Search (Ctrl/Cmd+K) and four "Start with" chips switch the city in place: favorites (the star by a city name or on a chip) first, then the latest searches (up to 50 listed in the empty search box), kept in local storage and starting from New York, London, Paris and Kyiv; without `?city=` the first chip opens; the overview shows the median of all models for the next 72 h in local 3-hour slots (temperature, wind speed with direction arrows, pressure, precipitation) with a synced crosshair and next-24-hour summaries; the run time sits beside Refresh, which is enabled once the chart is a slot old, together with a now line; "Open details" goes to the dashboard |
| City dashboard | `/city/[slug]`        | Back link, in-place city switcher, run time and Refresh; D3 spaghetti chart over 96 h in local 3-hour slots from the slot the run was fetched in (now line at the current time), min–max and interquartile bands, median, precipitation as median bars with per-model ticks, hovered as the 3-hour period each bar covers, hovered time above the chart, keyboard stepping; side list sorted by value; keys 1–9, 0 toggle models; disagreement tiles; precipitation panel (Recharts, lazy-loaded) with 6-hour totals from the chart start, per-model ticks and chance of rain; wind arrows; an age chip that turns amber when the data is old; table view on every chart                |
| Compare        | `/compare?cities=a,b` | Up to four cities in local 3-hour slots over 96 h, shared axis                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Methodology    | `/methodology`        | Sources, grids, median and spread, disagreement, limits, attribution                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Privacy, Terms | `/privacy`, `/terms`  | Privacy policy and terms of use, in English, from MDX in `apps/web/src/content/legal`; linked from the footer                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

A daily quota per user (60 new forecast requests, see DECISIONS P27) is shown as a meter in the top bar.

Phones (below 640 px) get their own layouts where the desktop ones don't fit (DECISIONS P37): the dashboard pins the variable switch under the top bar and puts the model list under the chart, and day labels shorten to fit.

Ukrainian, English, Spanish, German and French (language menu in the top bar; the non-English catalogs are machine-drafted and need a native review), light and dark mode.

## Scripts

| Command                                                        | What it does                                                                           |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `pnpm dev`                                                     | Starts the Docker services, then the API (`tsx watch`) and the web app (Turbopack)     |
| `pnpm db:up` / `db:deploy` / `db:migrate` / `db:seed`          | Docker services; apply migrations; create a new migration; seed models and cities      |
| `pnpm build`                                                   | Next.js build, the API's Lambda bundle (esbuild), Prisma client                        |
| `pnpm test`                                                    | Vitest in every package; database tests run when `DATABASE_URL` is reachable           |
| `pnpm lint` / `typecheck` / `format` / `format:check`          | ESLint, TypeScript, Prettier with organize-imports                                     |
| `pnpm check:messages`                                          | Key parity across the five catalogs and literal key usage in code                      |
| `pnpm knip`                                                    | Unused files, exports and dependencies across the workspace (`knip.jsonc`)             |
| `pnpm e2e`                                                     | Playwright flows on desktop and phone against a fake upstream (run `pnpm build` first) |
| `pnpm cdk:synth` / `cdk:diff` / `cdk:deploy` / `cdk:bootstrap` | The AWS CDK stack in `infra/` (run `pnpm build` first; see [Deploy](#deploy))          |
| `pnpm --filter @fa/web flags`                                  | Re-copy the SVG country flags into `apps/web/public/flags`                             |

## Architecture

```
Browser ── TanStack Query ──▶ /api/* ──▶ Express REST (zod-validated, rate-limited, per-client quota)
                                            │
                                            ├─ geocode ───────────▶ Open-Meteo Geocoding (Redis cache 24 h)
                                            ├─ latest / compare ──▶ Postgres snapshot; stale → fetch ─▶ Open-Meteo + met.no
                                            │                        └─▶ Postgres (weekly partitions), pruned once a day
                                            └─ cities / health ─▶ Postgres
```

## Layout

```
apps/
  web/            Next.js pages, components, TanStack Query hooks, Redux slices, next-intl catalogs
  api/            Express app: routes, rate limits, error shape; bundled for Lambda
  e2e/            Playwright flows and the fake upstream they run against
packages/
  shared/         zod API contract, model palette, variables, ensemble maths, resampling, 3-hour slots, formatting
  server/         the API's domain code: store, cache, quota, collector, retention, sources
  db/             Prisma schema, migrations (weekly Forecast partitions), seed, partition maintenance
  ui/             shadcn components, color mode, generic hooks
  charts/         D3 hero charts, Recharts wrappers, chart colors read from the CSS tokens
  fixtures/       real upstream responses and a collector snapshot for tests
docs/             DECISIONS.md (design decisions), METHODOLOGY.md (grids, slots, ensemble maths)
```

## Target architecture

What is built and what is still planned; the choices behind each piece are in DECISIONS P29 onwards.

- **Web:** Next.js App Router, Tailwind v4 and shadcn/ui with a token system, Redux Toolkit for UI state, TanStack Query for server state, Recharts, D3 for the hero charts, next-intl (uk, en, es, de, fr). On Lambda behind CloudFront (the target named Amplify Hosting, which does not support Next.js 16).
- **API:** Express 5 REST on AWS Lambda (Web Adapter) behind CloudFront, with the same zod contract.
- **Data:** Prisma on Postgres (Neon) with forecasts partitioned by issue time; Redis (Upstash) for the geocode and payload caches, rate limits, the quota and the daily retention claim.
- **Collection:** on demand only, in the API, when a city is opened and a newer run exists (the target had a scheduled Lambda every 6 hours; removed in DECISIONS P46).
- **Infrastructure and tooling:** one AWS CDK stack; a pnpm and Turborepo monorepo (`apps/web`, `apps/api`, `packages/shared`, `packages/charts`, `packages/ui`, `packages/db`, `packages/fixtures`, `infra`); CI runs lint, knip, typecheck, tests, the catalog check, end-to-end tests, the build and `cdk synth`.
- **Optional:** a daily Gemini Flash brief with a claim checker.

The web app runs on Lambda instead of Amplify (DECISIONS P35, P36). Truth, skill scores, the scoreboard and the evolution view are out of the MVP (DECISIONS P17, P20).

## Deploy

One CDK stack (`infra/`, in your AWS profile's region, `eu-central-1` if it has none) holds the web and API functions, CloudFront, the GitHub deploy role and a monthly budget alarm. Postgres (Neon) and Redis (Upstash) are external.

1. Create three SecureString parameters the functions read at cold start: `/forecast-arena/DATABASE_URL` (the pooled connection string), `/forecast-arena/REDIS_URL` (`rediss://…`) and `/forecast-arena/METNO_USER_AGENT`.
2. Apply migrations from your machine with the unpooled URL: `DIRECT_URL=<url> DATABASE_URL=<url> pnpm db:deploy` (deploys never migrate), then `pnpm db:seed` with the same variables.
3. Once per account and region: `pnpm build && pnpm cdk:bootstrap --profile <profile>`.
4. Deploy: `pnpm build && pnpm cdk:deploy --profile <profile> -c budgetEmail=<address> -c githubRepo=<owner>/<repo>`. The stack output `SiteUrl` is the site.

After that, pushes to `main` deploy through GitHub OIDC (`.github/workflows/deploy.yml`) once the repository has the variables `AWS_DEPLOY_ROLE_ARN` (stack output `DeployRoleArn`) and `AWS_REGION`, and the secret `BUDGET_EMAIL`.

## Design decisions

The full log, with the rejected alternatives, is [docs/DECISIONS.md](docs/DECISIONS.md). The ones a newcomer is most likely to undo by accident:

- **Models are compared with each other, not with observations** (P17). Accuracy needs truth data and its own UI; it is a post-MVP feature.
- **The server returns raw series; the client derives everything** (P8). Medians, quartiles, slots, disagreement and labels are pure functions in `packages/shared`, unit-tested.
- **Charts start where the data starts** (P39). They start at the local 3-hour slot the run was fetched in, with a now line at the current time; a background refetch could swap in a newer run under the reader, so the landing chart only moves on Refresh.
- **Precipitation is a total over a span** (P18, P21, P23): bars, not lines, and hovered as the period each bar covers.
- **The design is frozen in `globals.css`** (P25). The Theme Lab that chose it was removed; it is in the history if a redesign needs it.
- **Redis is never on the critical path** (P31). Upstash's free plan only; any Redis error means no cache, no limit and a granted claim for that call, never an outage or a bill.
- **One hourly grid per run, weekly partitions** (P26, P30). Forecast rows are partitioned by issue week and dropped after 14 days by the first fetch of each day.
- **The model palette is fixed** (P9), with dash patterns where two colors are too close for color-vision deficiencies.

## Data and attribution

Weather data by [Open-Meteo.com](https://open-meteo.com/) (CC BY 4.0) and [MET Norway](https://api.met.no/) (CC BY 4.0). Geocoding by Open-Meteo (GeoNames). Non-commercial use. Flags from `country-flag-icons` (MIT).

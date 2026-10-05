# Forecast Arena

Ten weather models for any city and how much they disagree. Public, no login. Measuring which model has been right is a separate feature planned after the MVP.

A pnpm and Turborepo monorepo: a Next.js web app, an Expo (React Native) app in progress and an Express REST API on Postgres (Prisma) and Redis, with an AWS CDK stack for Lambda and CloudFront. Live data comes from Open-Meteo and MET Norway. The [design decisions](#design-decisions) a newcomer is most likely to undo are at the end.

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

Open any city and its forecast is fetched within a few seconds; search for any other city to open it the same way. Nothing is collected on a schedule: a city's forecast is fetched when someone opens it and a newer 6-hour run exists. The web app forwards `/api/*` to the API, so the browser sees one origin.

### Mobile app

`apps/mobile` is an Expo app (SDK 57, Expo Router, New Architecture) that will show the same product on Android and iOS; today it opens on a Home screen drawn from the shared catalogs and design tokens. It needs a development build, not Expo Go, and an Android device or emulator; builds need JDK 17 (`JAVA_HOME`) and CMake 3.31.6 from Android Studio's SDK Manager, the version `app.json` pins through `expo-build-properties` because the SDK's default CMake ships a ninja that cannot stat the long paths of a pnpm workspace on Windows.

```bash
pnpm --filter @fa/mobile android   # build, install and start the development build
pnpm --filter @fa/mobile start     # Metro for an installed development build
pnpm --filter @fa/mobile tokens    # regenerate src/theme/tokens.ts after editing apps/web/src/app/globals.css
```

iOS builds run only in the cloud (`eas build --profile simulator --platform ios`): without a Mac the app is checked in a simulator, never on an iPhone.

## What works

| Screen         | Route                 | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Landing        | `/?city=`             | Search (Ctrl/Cmd+K) and four "Start with" chips switch the city in place: favorites (the star by a city name or on a chip) first, then the latest searches (up to 50 listed in the empty search box), kept in local storage and starting from New York, London, Paris and Kyiv; without `?city=` the first chip opens; the overview shows the median of all models for the next 72 h in local 3-hour slots (temperature, wind speed with direction arrows, pressure, precipitation) with a synced crosshair and next-24-hour summaries; a now line marks the current time, and the run's age chip and Refresh appear once the data is 3 hours old; "Open details" goes to the dashboard |
| City dashboard | `/city/[slug]`        | Back link, in-place city switcher, run time and Refresh; D3 spaghetti chart over 96 h in local 3-hour slots from the slot the run was fetched in (now line at the current time), min–max and interquartile bands, median, precipitation as median bars with per-model ticks, hovered as the 3-hour period each bar covers, hovered time above the chart, keyboard stepping; side list sorted by value; keys 1–9, 0 toggle models; disagreement tiles; precipitation panel (Recharts, lazy-loaded) with 6-hour totals from the chart start, per-model ticks and chance of rain; wind arrows; an age chip that turns amber when the data is old; table view on every chart                |
| Compare        | `/compare?cities=a,b` | Up to four cities in local 3-hour slots over 96 h, shared axis                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Methodology    | `/methodology`        | Sources, grids, median and spread, disagreement, limits, attribution                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Privacy, Terms | `/privacy`, `/terms`  | Privacy policy and terms of use, in English, from MDX in `apps/web/src/content/legal`; linked from the footer                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

A daily quota per user (60 upstream fetches a day per client, 600 for the whole app) is shown as a meter in the top bar.

Phones (below 640 px) get their own layouts where the desktop ones don't fit: the dashboard pins the variable switch under the top bar and puts the model list under the chart, and day labels shorten to fit.

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
  web/            Next.js pages, components, Redux slices, next-intl setup
  mobile/         Expo app: Expo Router routes in src/app re-export screens from src/screens; tokens generated from the web CSS
  api/            Express app: routes, rate limits, error shape; bundled for Lambda
  e2e/            Playwright flows and the fake upstream they run against
packages/
  shared/         zod API contract, model palette, variables, ensemble maths, resampling, 3-hour slots, formatting, places rules
  api-client/     fetch wrapper (configurable origin and POST digest), TanStack Query hooks, the query client
  messages/       the five message catalogs and their loader
  server/         the API's domain code: store, cache, quota, collector, retention, sources
  db/             Prisma schema, migrations (weekly Forecast partitions), seed, partition maintenance
  ui/             shadcn components, color mode, generic hooks
  chart-core/     DOM-free chart geometry: scales, ticks, day labels, spaghetti paths
  charts/         D3 hero charts, Recharts wrappers, chart colors read from the CSS tokens
  fixtures/       real upstream responses and a collector snapshot for tests
```

## Target architecture

What is built and what is still planned.

- **Web:** Next.js App Router, Tailwind v4 and shadcn/ui with a token system, Redux Toolkit for UI state, TanStack Query for server state, Recharts, D3 for the hero charts, next-intl (uk, en, es, de, fr). On Lambda behind CloudFront (the target named Amplify Hosting, which does not support Next.js 16).
- **API:** Express 5 REST on AWS Lambda (Web Adapter) behind CloudFront, with the same zod contract.
- **Data:** Prisma on Postgres (Neon) with forecasts partitioned by issue time; Redis (Upstash) for the geocode and payload caches, rate limits, the quota and the daily retention claim.
- **Collection:** on demand only, in the API, when a city is opened and a newer run exists; nothing runs on a schedule.
- **Infrastructure and tooling:** one AWS CDK stack; a pnpm and Turborepo monorepo (`apps/web`, `apps/api`, `packages/shared`, `packages/charts`, `packages/ui`, `packages/db`, `packages/fixtures`, `infra`); CI runs lint, knip, typecheck, tests, the catalog check, end-to-end tests, the build and `cdk synth`.
- **Optional:** a daily Gemini Flash brief with a claim checker.

The web app runs on Lambda instead of Amplify. Truth, skill scores, the scoreboard and the evolution view are out of the MVP.

## Deploy

One CDK stack (`infra/`, in your AWS profile's region, `eu-central-1` if it has none) holds the web and API functions, CloudFront, the GitHub deploy role and a monthly budget alarm. Postgres (Neon) and Redis (Upstash) are external.

1. Create three SecureString parameters the functions read at cold start: `/forecast-arena/DATABASE_URL` (the pooled connection string), `/forecast-arena/REDIS_URL` (`rediss://…`) and `/forecast-arena/METNO_USER_AGENT`.
2. Apply migrations from your machine with the unpooled URL: `DIRECT_URL=<url> DATABASE_URL=<url> pnpm db:deploy` (deploys never migrate), then `pnpm db:seed` with the same variables.
3. Once per account and region: `pnpm build && pnpm cdk:bootstrap --profile <profile>`.
4. Deploy: `pnpm build && pnpm cdk:deploy --profile <profile> -c budgetEmail=<address> -c githubRepo=<owner>/<repo>`. The stack output `SiteUrl` is the site.

After that, pushes to `main` deploy through GitHub OIDC (`.github/workflows/deploy.yml`) once the repository has the variables `AWS_DEPLOY_ROLE_ARN` (stack output `DeployRoleArn`) and `AWS_REGION`, and the secret `BUDGET_EMAIL`.

## Design decisions

The ones a newcomer is most likely to undo by accident:

- **Models are compared with each other, not with observations.** Accuracy needs truth data and its own UI; it is a post-MVP feature.
- **The server returns raw series; the client derives everything.** Medians, quartiles, slots, disagreement and labels are pure functions in `packages/shared`, unit-tested.
- **Charts start where the data starts.** They start at the local 3-hour slot the run was fetched in, with a now line at the current time; a background refetch could swap in a newer run under the reader, so the landing chart only moves on Refresh.
- **Precipitation is a total over a span:** bars, not lines, and hovered as the period each bar covers.
- **The design is frozen in `globals.css`.** The Theme Lab that chose it was removed; it is in the history if a redesign needs it.
- **Redis is never on the critical path.** Upstash's free plan only; any Redis error means no cache, no limit and a granted claim for that call, never an outage or a bill.
- **One hourly grid per run, weekly partitions.** Forecast rows are partitioned by issue week and dropped after 14 days by the first fetch of each day.
- **The model palette is fixed,** with dash patterns where two colors are too close for color-vision deficiencies.
- **Forecasts are fetched on demand, never on a schedule.** Opening a city fetches it when its stored run predates the current 6-hour issue; everyone else then reads the stored run. A scheduled collector refreshed cities nobody opened and was removed; don't add one back for a feature without weighing that cost.
- **Limits and the quota count per client: an IPv4 address or an IPv6 /64.** An IPv4-mapped address counts as IPv4, and a global daily cap protects the free upstream tiers. Keying IPv6 by the full address would let one /64 rotate through endless fresh quotas.
- **The mobile app shares code, not UI.** It consumes `@fa/shared`, `@fa/api-client`, `@fa/chart-core` and `@fa/messages`; its components are React Native, and its colours come from tokens generated from `globals.css`. Both apps run the React version the Expo SDK pins (19.2.3), because the flat `node_modules` that Android builds on Windows need allows only one; upgrade React with the Expo SDK. Shared packages declare `react` only as a peer.

## Data and attribution

Weather data by [Open-Meteo.com](https://open-meteo.com/) (CC BY 4.0) and [MET Norway](https://api.met.no/) (CC BY 4.0). Geocoding by Open-Meteo (GeoNames). Non-commercial use. Flags from `country-flag-icons` (MIT).

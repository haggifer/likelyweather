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
pnpm db:seed              # the eleven seed cities
pnpm api                  # Docker services, then the API on http://localhost:4000
pnpm web                  # in a second terminal: the web app on http://localhost:3000
```

Open any city and its forecast is fetched within a few seconds; search for any other city to open it the same way. Nothing is collected on a schedule (the Android widget, which its owner places, is the one scheduled reader, every 3 hours): a city's forecast is fetched when someone opens it and the stored one is 3 hours old, the same moment the page offers Refresh, and a run that lost a source (a PARTIAL run) is fetched again after 15 minutes, and after a fetch that got nothing the stored run is served for 15 minutes before the next try. The web app forwards `/api/*` to the API, so the browser sees one origin.

### Mobile app

`apps/mobile` is the same product as an Expo app for Android (SDK 57, Expo Router, New Architecture), drawn with React Native and `react-native-svg` from the same packages as the web: the API client and its hooks, the chart geometry and dashboard maths, the places rules and the five catalogs.

- **Home:** search any place (or "Use my location", which beyond the nearest stored city's 50 km asks Android's geocoder for the town's name and searches it), the four "Start with" chips with their stars, the ten-day overview that scrolls sideways (a tap picks a slot), the age chip and Refresh, and "Open details".
- **City:** the city's header (the star and the pencil, which switches city; the age chip and Refresh), the variable switch pinned under it while the screen scrolls, the multi-model chart with its bands and median and a table view, the model list (the eye hides a model, the median too), and the disagreement tiles in one row.
- **Methodology** and **Settings:** language and theme (device default or chosen), the day's request quota, the cities the widgets show, and links to the privacy policy and terms on the site.
- **Offline:** forecasts, places and settings live on the device (MMKV); the query cache is restored at launch and kept for a day, a restored forecast that is 3 hours old is fetched again when first shown, and queries wait while the network is down.
- **Home-screen widget** (`react-native-android-widget`): a 2 × 1 with the city, the median temperature and today's agreement, and a 4 × 2 that adds the next 24 hours' range, wind and rain; both show the run's age once it is 3 hours old, and the agreement chip only on the day it describes. Placing one asks for the city among the viewer's places; it refreshes every 3 hours and whenever the Home overview loads that city (unless it already shows a newer run), keeps its last numbers offline, and a tap opens the city.

Development builds call the live API unless `apps/mobile/.env.local` sets `EXPO_PUBLIC_API_ORIGIN` (`apps/mobile/.env.example`; for the local API also run `adb reverse tcp:4000 tcp:4000`). The app needs a development build, not Expo Go, and an Android device or emulator; builds need a JDK 17 or 21 (on PATH or in `JAVA_HOME`, not Android Studio's bundled 25) and CMake 4.1.2 from Android Studio's SDK Manager, the version `app.json` pins through `expo-build-properties` because the SDK's default CMake ships a ninja that cannot stat the long paths of a pnpm workspace on Windows.

```bash
pnpm --filter @fa/mobile android   # build, install and start the development build
pnpm mobile                        # Metro for an installed development build
pnpm --filter @fa/mobile tokens    # regenerate src/theme/tokens.ts after editing apps/web/src/app/globals.css
pnpm --filter @fa/mobile icons     # regenerate the app icons and splash from the web's cloud-sun logo
```

iOS builds run only in the cloud (`eas build --profile simulator --platform ios`): without a Mac the app is checked in a simulator, never on an iPhone.

## What works

| Screen         | Route                | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Landing        | `/?city=`            | Search and four "Start with" chips switch the city in place: favorites (the star by a city name or on a chip) first, then the latest searches (up to 50 listed in the empty search box), kept in local storage; a first visit starts from the four largest places of the visitor's country (CloudFront's `CloudFront-Viewer-Country`, a table generated from GeoNames in `apps/api/src/domain/country-starters.ts`), topped up with New York, London, Paris and Kyiv; without `?city=` the first chip opens; the overview shows the median of all models for the next ten days in local 3-hour slots (temperature with feels-like, wind speed with gusts and direction arrows, pressure, precipitation with the chance of rain per slot) with a synced crosshair; a chart never squeezes a slot below the width of a three-digit label and scrolls sideways under its pinned axis instead, opening at now; a now line marks the current time, and the run's age chip and Refresh appear once the data is 3 hours old; "Open details" goes to the dashboard |
| City dashboard | `/city/[slug]`       | Back link, in-place city switcher, run time and Refresh; eight variables (temperature, feels-like, wind speed, wind gusts, pressure, precipitation, humidity, cloud cover); D3 spaghetti chart over ten days in local 3-hour slots, scrolling sideways like the overview from the slot the run was fetched in (now line at the current time), the min–max band, median, precipitation as median bars with per-model ticks, hovered as the 3-hour period each bar covers, hovered time above the chart, keyboard stepping; side list sorted by value (hover a model to highlight it, the eye hides it); disagreement tiles in one full-width row (it scrolls when the days do not fit); wind arrows; an age chip that turns amber when the data is old; table view on every chart                                                                                                                                                                                                                                                                           |
| Archive        | `/archive?city=`     | A city's past weather for a period of up to 12 days (1940 to yesterday, two date fields), drawn like the overview but hour by hour, with its own panel choice; the same search and chips; the period and panels kept in local storage (`fa.archive`); from Open-Meteo's Historical Weather API (ERA5 and the ECMWF IFS analysis), fetched once per city and period and stored for good (`ArchiveHour`), so a period already stored costs no request                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Methodology    | `/methodology`       | Sources, grids, median and spread, disagreement, limits, attribution                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Privacy, Terms | `/privacy`, `/terms` | Privacy policy and terms of use, in English, from MDX in `apps/web/src/content/legal`; linked from the footer                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

"Use my location" in the landing search card opens the nearest stored city when it is within 50 km (`GET /api/cities/nearest`, coordinates rounded to about a kilometre, nothing stored), and otherwise names it with its distance. On the dashboard the median line hides and shows like any model.

A daily quota per user (60 upstream fetches a day per client, 600 for the whole app) is shown as a meter in the top bar; the last answer is kept in local storage so the meter is there as soon as a page opens.

Android phones get a dismissible "Get the app" bar on the landing and city pages when `NEXT_PUBLIC_APP_PROMO_URL` names the latest APK release at build time (`apps/web/.env.example`); dismissed, it stays away for 30 days.

Phones (below 640 px) get their own layouts where the desktop ones don't fit: the dashboard pins the variable switch under the top bar and puts the model list under the chart, and day labels shorten to fit.

Ukrainian, English, Spanish, German and French (language menu in the top bar; the non-English catalogs are machine-drafted and need a native review), light and dark mode.

## Scripts

| Command                                                        | What it does                                                                                    |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `pnpm api` / `web` / `mobile`                                  | One terminal each: Docker services then the API (`tsx watch`); the web app (Turbopack); Metro   |
| `pnpm db:up` / `db:deploy` / `db:migrate` / `db:seed`          | Docker services; apply migrations; create a new migration; seed the cities                      |
| `pnpm build`                                                   | Next.js build, the API's Lambda bundle (esbuild), Prisma client                                 |
| `pnpm test`                                                    | Vitest in every package but `apps/mobile` (Jest); database tests run when `DATABASE_URL` is set |
| `pnpm lint` / `typecheck` / `format` / `format:check`          | ESLint, TypeScript, Prettier with organize-imports                                              |
| `pnpm check:messages`                                          | Key and ICU argument parity across the five catalogs, and literal key usage in code             |
| `pnpm knip`                                                    | Unused files, exports and dependencies across the workspace (`knip.jsonc`)                      |
| `pnpm e2e`                                                     | Playwright flows on desktop and phone against a fake upstream (run `pnpm build` first)          |
| `pnpm cdk:synth` / `cdk:diff` / `cdk:deploy` / `cdk:bootstrap` | The AWS CDK stack in `infra/` (run `pnpm build` first; see [Deploy](#deploy))                   |
| `pnpm --filter @fa/web flags`                                  | Re-copy the SVG country flags into `apps/web/public/flags`                                      |

## Architecture

```
Browser ── TanStack Query ──▶ /api/* ──▶ Express REST (zod-validated, rate-limited, per-client quota)
                                            │
                                            ├─ geocode ───────────▶ Open-Meteo Geocoding (Redis cache 24 h)
                                            ├─ latest ────────────▶ Postgres snapshot; stale → fetch ─▶ Open-Meteo + met.no
                                            │                        └─▶ Postgres (weekly partitions), pruned once a day
                                            └─ cities / health ─▶ Postgres
```

## Layout

```
apps/
  web/            Next.js pages, components, Redux slices, next-intl setup; src/components/ui holds the shadcn
                  components, src/components/charts the D3 charts (chart colors read
                  from the CSS tokens)
  mobile/         Expo app: Expo Router routes in src/app re-export screens from src/screens; tokens generated from the web CSS
  api/            Express app: routes, rate limits, error shape; bundled for Lambda; src/domain holds the domain
                  code: store, cache, quota, collector, retention, sources
  e2e/            Playwright flows and the fake upstream they run against
packages/
  shared/         zod API contract, model palette, variables, ensemble maths, resampling, 3-hour slots, formatting, places rules
  api-client/     fetch wrapper (configurable origin and POST digest), TanStack Query hooks, the query client
  messages/       the five message catalogs and their loader
  db/             Prisma schema, migrations (weekly Forecast partitions), seed, partition maintenance
  chart-core/     DOM-free chart geometry: scales, ticks, day labels, spaghetti paths
  hooks/          React hooks both apps share, with no DOM or React Native code (view logic above the kits)
  fixtures/       real upstream responses and a collector snapshot for tests
```

## Target architecture

What is built and what is still planned.

- **Web:** Next.js App Router, Tailwind v4 and shadcn/ui with a token system, Redux Toolkit for UI state, TanStack Query for server state, D3 for the charts, next-intl (uk, en, es, de, fr). On Lambda behind CloudFront (the target named Amplify Hosting, which does not support Next.js 16).
- **API:** Express 5 REST on AWS Lambda (Web Adapter) behind CloudFront, with the same zod contract.
- **Data:** Prisma on Postgres (Neon) with forecasts partitioned by issue time; Redis (Upstash) for the geocode and payload caches, rate limits, the quota and the daily retention claim.
- **Collection:** on demand only, in the API, when a city is opened and its stored forecast is 3 hours old; nothing runs on a schedule but the Android widget's 3-hourly redraw, which reads like an open.
- **Infrastructure and tooling:** one AWS CDK stack; a pnpm and Turborepo monorepo (`apps/web`, `apps/api`, `apps/mobile`, `apps/e2e`, `packages/shared`, `packages/api-client`, `packages/chart-core`, `packages/hooks`, `packages/messages`, `packages/db`, `packages/fixtures`, `infra`); CI runs lint, knip, typecheck, tests, the catalog check, end-to-end tests, the build and `cdk synth`.
- **Not built:** a daily Gemini Flash brief with a claim checker.

The web app runs on Lambda instead of Amplify. Truth, skill scores, the scoreboard and the evolution view are out of the MVP.

## Deploy

One CDK stack (`infra/`, deployed to your AWS profile's region; use `eu-central-1`, where Neon and Upstash run) holds the web and API functions, CloudFront with security headers, an error alarm e-mailed through SNS, the GitHub deploy role and a monthly budget alarm. Postgres (Neon) and Redis (Upstash) are external.

1. Create three SecureString parameters the functions read at cold start: `/forecast-arena/DATABASE_URL` (the pooled connection string), `/forecast-arena/REDIS_URL` (`rediss://…`) and `/forecast-arena/METNO_USER_AGENT`. The API refuses to start on AWS when `METNO_USER_AGENT` is missing, and logs a warning when `REDIS_URL` is.
2. Apply migrations from your machine with the unpooled URL: `DIRECT_URL=<url> DATABASE_URL=<url> pnpm db:deploy` (deploys never migrate), then `pnpm db:seed` with the same variables. On a live stack, a migration that only adds runs before the deploy; one that drops columns the running code reads runs after it.
3. Once per account and region: `pnpm build && pnpm cdk:bootstrap --profile <profile>`.
4. Deploy: `pnpm build && pnpm cdk:deploy --profile <profile> -c budgetEmail=<address> -c githubRepo=<owner>/<repo>`. The stack output `SiteUrl` is the site. Confirm the SNS subscription e-mail once, or the error alarm reaches nobody.

After that, pushes to `main` deploy through GitHub OIDC once CI has passed on them (`.github/workflows/deploy.yml`), as soon as the repository has the variables `AWS_DEPLOY_ROLE_ARN` (stack output `DeployRoleArn`) and `AWS_REGION`, and the secret `BUDGET_EMAIL`.

## Design decisions

The ones a newcomer is most likely to undo by accident:

- **Models are compared with each other, not with observations.** Accuracy needs truth data and its own UI; it is a post-MVP feature.
- **The server returns raw series; the client derives everything.** Medians, ranges, slots, disagreement and labels are pure functions in `packages/shared`, unit-tested. Feels-like is the one value computed when a run is stored, with Open-Meteo's own formula (`packages/shared/src/apparent-temperature.ts`), so met.no gets the same formula and the sunshine it needs is never stored.
- **Charts start where the data starts.** They start at the local 3-hour slot the run was fetched in, with a now line at the current time; forecast queries never refetch on a timer (a refetch past 3 hours would collect the city and spend the viewer's quota without a click, and swap a newer run in under the reader), so a chart only moves on Refresh.
- **Precipitation is a total over a span:** bars, not lines, and hovered as the period each bar covers.
- **The design is frozen in `globals.css`.** The Theme Lab that chose it was removed; it is in the history if a redesign needs it.
- **Redis is never on the critical path.** Upstash's free plan only; any Redis error means no cache, no limit and a granted claim for that call, never an outage or a bill.
- **One hourly grid per run, weekly partitions.** A run covers 14 days (9 hours back and 327 ahead, the most one Open-Meteo call covers); a model's rows stop where its forecast does. Forecast rows are partitioned by issue week and dropped after 14 days by the first fetch of each day.
- **The model palette is fixed,** with dash patterns where two colors are too close for color-vision deficiencies.
- **Forecasts are fetched on demand, with one scheduled reader.** Opening a city fetches it when its stored forecast is 3 hours old (`isRefreshDue`, shared with the UI's Refresh); a PARTIAL run is retried after 15 minutes, and a fetch that got nothing waits 15 minutes before the next; everyone else then reads the stored one. The Android widget is the one scheduled reader: Android redraws it every 3 hours, the age at which a stored run is refreshed, through the same `/latest` route, so it costs its owner's quota and nobody else's. A scheduled collector refreshed cities nobody opened and was removed; don't add one back for a feature without weighing that cost.
- **Limits and the quota count per client: an IPv4 address or an IPv6 /64.** An IPv4-mapped address counts as IPv4, and a global daily cap protects the free upstream tiers. Keying IPv6 by the full address would let one /64 rotate through endless fresh quotas.
- **The mobile app and the web's phone layout stay in sync.** Every change to what a phone shows or does lands in both apps, so neither drifts into a second product; only platform features (the widget, the "Get the app" bar, the landing page's pitch, which an installed app doesn't need) stay one-sided.
- **The mobile app shares code and one UI library family with the web** (2026-10-13). Component code can't be shared without react-native-web (Radix renders DOM), so each app has its own kit from the same family, shadcn/ui on the web and React Native Reusables in the app, with the same component names, variants and props, and the app's Uniwind theme generated from `globals.css`. Everything above the kits is shared: `@fa/shared`, `@fa/api-client`, `@fa/chart-core`, `@fa/hooks` and `@fa/messages`. Both apps run the React version the Expo SDK pins (19.2.3), so the shared packages resolve one React; upgrade React with the Expo SDK. Shared packages declare `react` only as a peer.

## Data and attribution

Weather data by [Open-Meteo.com](https://open-meteo.com/) (CC BY 4.0) and [MET Norway](https://api.met.no/) (CC BY 4.0). Geocoding by Open-Meteo (GeoNames). Open-Meteo's free API is for non-commercial use, like the code itself. Flags from `country-flag-icons` (MIT).

## License

The code is source-available under the [PolyForm Noncommercial License 1.0.0](LICENSE): anyone may read, run, change and share it for any noncommercial purpose (personal study, hobby projects, research, education, charities, public bodies), and nobody may use it commercially, including selling it or anything built on it. It is not an open-source license in the OSI sense. The weather data stays under its providers' CC BY 4.0 terms.

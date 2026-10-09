# AGENTS.md

Guidance for coding agents working in this repository. Read [README.md](README.md) first: it covers what the app does, how to run it, the architecture, the repository layout and the design decisions behind them. The grids, slots and ensemble maths are defined in `packages/shared` (`slots.ts`, `resample.ts`, `ensemble.ts`) and their tests.

## Commands

```bash
pnpm install
cp .env.example .env         # once; the API and Prisma read the root .env
pnpm db:up                   # Postgres and Redis in Docker
pnpm db:deploy && pnpm db:seed
pnpm api                     # Docker services, then the API on :4000 (one terminal per app)
pnpm web                     # web on :3000
pnpm lint
pnpm knip                    # unused files, exports and dependencies (knip.jsonc)
pnpm typecheck
pnpm test                    # database tests run when DATABASE_URL is set (the root .env sets it locally; CI passes it through turbo.json), and are skipped otherwise
pnpm check:messages          # catalog key and ICU argument parity, and literal key usage
pnpm build && pnpm e2e       # Playwright against a fake upstream and its own database (<DATABASE_URL>_e2e)
pnpm format
pnpm build                   # Next.js, the API's Lambda bundle, the Prisma client
pnpm db:migrate              # create a migration after editing packages/db/prisma/schema.prisma
pnpm cdk:synth               # also cdk:diff, cdk:deploy, cdk:bootstrap; needs pnpm build first
pnpm mobile                        # Expo dev server (Metro) for the mobile development build (apps/mobile)
pnpm --filter @fa/mobile android   # build and run the development build on a device or emulator (JDK 17 or 21)
pnpm --filter @fa/mobile tokens    # regenerate the app's design tokens after editing globals.css (a test fails until you do)
```

## Rules that must not break

- **UI kit.** Tailwind v4 and shadcn/ui only; no other component library. Colors, fonts and radii come from token-backed utilities (`apps/web/src/app/globals.css`), never literals in components. Dark mode is the `.dark` class on `<html>` (`apps/web/src/lib/color-mode.ts`); charts re-read their colors when it changes.
- **Model palette.** `packages/shared/src/models.ts` fixes one color per model; never reassign it. ECMWF AIFS and met.no keep their dash patterns as a second encoding.
- **API contract.** The zod schemas in `packages/shared/src/api.ts` are the contract; change them first. A change that alters what the mobile app keeps in its persisted query cache also bumps `CACHE_SCHEMA` in `apps/mobile/src/lib/query-cache.ts`, so installed apps drop the old cache. The server returns stored data; the client derives medians, slots, labels and formatting with `packages/shared`.
- **Upstream calls.** The browser never calls Open-Meteo or met.no. The API proxies geocoding and fetches a city's forecast when it is opened and the stored one is 3 hours old (`isRefreshDue` in `packages/shared/src/time.ts`, the same rule that enables Refresh in the UI), or 15 minutes old when the stored run is incomplete (PARTIAL, or FAILED because its process died mid-write; `isFreshSnapshot` in `apps/api/src/domain/cities.ts`); after a refresh that got no data, the stored run is served without fetching for 15 minutes; nothing is collected on a schedule. The one exception is the Android home-screen widget, which asks for its city on Android's update period, every 3 hours like the refresh rule; placing it is the viewer's explicit choice and the request spends that viewer's quota like opening the city. A forecast refresh spends one unit of the client's daily quota before it starts, whatever the number of sources it asks (`apps/api/src/domain/quota.ts`); geocoding spends a unit per search the cache cannot answer, while adding a city (`POST /cities/track`, one geocoder lookup per locale) is held by the hourly track limit instead, and the starter cities of a first visit are looked up without either; a client is an IPv4 address or an IPv6 /64 (`apps/api/src/client-key.ts`).
- **Time.** Timestamps are UTC in storage and the API. The UI shows local time first: the city's zone for anything about a city, the viewer's zone for what belongs to no city (the quota reset), and UTC only as hover text.
- **Precipitation** is always present in the schema and the UI.
- **State.** Redux holds UI state only; TanStack Query holds server state. Forecast queries never refetch on a timer: a refetch of a run 3 hours old makes the API collect the city and spends the viewer's quota, and on the landing overview it would swap a newer run in under the reader; only Refresh (or a remount after `staleTime`) asks again.
- **Catalogs.** `packages/messages/catalogs/{uk,en,es,de,fr}.json` keep identical keys; the web app and the mobile app read them.
- **Server code.** The API's domain code lives in `apps/api/src/domain` and never imports Express; the files at the top of `apps/api/src` are the HTTP layer (routes, limits, headers) and stay thin. Database access goes through `apps/api/src/domain/store.ts`, shared expiring state through `apps/api/src/domain/cache.ts`.
- **Redis is optional at runtime.** Every Redis call must degrade (no cache, no limit, claim granted) rather than fail a request. Never add ElastiCache.
- **Schema changes** go through Prisma migrations in `packages/db`. `Forecast` is partitioned by week: keep `issueTime` in its primary key and never write to it without `ensureForecastPartitions` (the store does this).
- **Legal pages.** `apps/web/src/content/legal/{privacy,terms}.mdx` describe what the app stores, logs and shares, its cookies and its providers. A change to any of these updates them and the `lastUpdated` prop of `apps/web/src/app/{privacy,terms}/page.tsx` in the same commit.
- **Scope.** The MVP compares models with each other, not with observations. Truth, skill scores and the scoreboard are post-MVP.

## Conventions

- A package in `packages/` holds code that more than one app uses, or the database; code only one app uses lives in that app (`apps/api/src/domain`, `apps/web/src/components/{ui,charts}`). Packages ship TypeScript source through explicit `exports`; a new file in `packages/chart-core` or `packages/api-client` (hooks excepted: `./hooks/*` covers them) needs an entry. Inside a package, import relatively; the `@/` alias exists only in `apps/web`.
- Named exports only (`export function Name({ … }: IProps)` for components and hooks, arrow functions for everything else); `export default` only where a framework requires it (Next.js `page`, `layout`, `not-found`, config files, next-intl's `i18n/request.ts`, Expo Router route files in `apps/mobile/src/app`). String unions for two or three options, enums for more.
- One hook per file in a `hooks/` folder, with an explicit return type (an exported `UseXResult` interface when it returns an object). Code that reads no props, state or hook result lives at module scope; types used by more than one file live in the nearest `types.ts`.
- A module reads top to bottom: imports, types, constants, helpers, exports; a component's `IProps` sits directly above it, and a value built from a helper sits below that helper.
- Bodies read in groups, one blank line between groups: in a component or hook, context hooks, then state and refs, queries, derived values, handlers, effects, early returns and the JSX. A value takes one line; a computation longer than about three lines becomes a named function at module scope or in a kebab-case module.
- File names: components PascalCase, hooks camelCase, every other module kebab-case and named by what it holds (no `utils.ts`). Sizes are written in `rem` (design tokens in `globals.css` and arbitrary Tailwind values alike) so they follow the browser's font-size setting; hairlines, shadows and chart geometry stay in px.
- Formatting is Prettier (`.prettierrc`: 4 spaces, single quotes, no semicolons, width 120); linting is ESLint. Format only the files you touch.
- Phone layouts (below `sm`, 640 px) switch with `max-sm:` / `sm:` utilities, so the server HTML matches the first client render; a JS media query (`useMediaQuery`, written in `rem` like Tailwind's breakpoints) only where CSS can't do the job, such as the landing overview's chart, whose drawing changes on phones.
- Comments explain why, not what.
- Tests land with the code (`*.test.ts` next to the module). `apps/mobile` tests run on Jest (`jest-expo`, React Native Testing Library), because Vitest does not run React Native; every other package uses Vitest. Expo Router bundles every file in `apps/mobile/src/app` as a route, so route files only re-export a screen from `src/screens` (the root `_layout.tsx` is the exception: it holds the providers and the stack), and tests live next to the screens.
- Commits follow Conventional Commits (`feat(scope): …`, `fix: …`, `docs: …`), one commit per distinct change.
- When a change affects a command, env variable, rule above or design decision, update README.md or this file in the same commit.

## Gotchas

- Next.js 16: route `params` is a Promise, and the `PageProps`/`RouteContext` types come from `next typegen` (run by `pnpm typecheck`).
- `METNO_USER_AGENT` must name a real contact; met.no throttles or blocks anonymous clients.
- After renaming message keys, the dev server can hot-reload a component before its catalog and log `MISSING_MESSAGE`; a full reload clears it.
- Recharts' `ResponsiveContainer` renders nothing while its container has zero width, for example in a hidden tab.
- `import` and `deploy` are built-in pnpm commands (`pnpm import` deletes and rewrites the lockfile), so scripts never use those names and root scripts call filtered packages through `pnpm --filter <pkg> run <script>`.
- pnpm passes a literal `--` through to the script: write `pnpm cdk:deploy --profile <name>`, not `pnpm cdk:deploy -- --profile <name>` (CDK would read the flags as stack names).
- `prisma generate` runs as `@fa/db`'s build step; Turbo runs it before any package's typecheck or test. After editing the schema, run `pnpm --filter @fa/db build` if the editor reports missing types.
- `next.config` rewrites are fixed at build time; runtime routing (like forwarding `/api/*` to `API_ORIGIN`) belongs in `apps/web/src/proxy.ts`.
- The e2e suite runs the production web build: rebuild (`pnpm build`) after web changes before `pnpm e2e`. The phone suite asserts the "Get the app" bar only when `NEXT_PUBLIC_APP_PROMO_URL` is set in its shell, and the bar exists only in a build made with it: set it for both `pnpm build` and `pnpm e2e` to cover it (CI does), and leave it out of `apps/web/.env.local` until the first APK release exists, or a deploy built here would link to nothing.
- `apps/mobile` builds need CMake 4.1.2 from Android Studio's SDK Manager (pinned in `app.json` through `expo-build-properties`: the SDK's default CMake bundles a ninja that cannot handle a pnpm workspace's long paths on Windows) and a JDK 17 or 21, not Android Studio's bundled JDK (25 since Android Studio 2026.2), whose warnings fail React Native's CMake steps; `android/` and `ios/` are generated by `expo prebuild` and never committed. Use a development build, not Expo Go.
- pnpm uses its default isolated `node_modules`: each package sees only what its own `package.json` declares. The Android native build compiles inside `node_modules/.pnpm` at paths past Windows' 260 characters; the CMake 4.1.2 pin above and Windows long paths handle them (a clean build was verified on 2026-10-08), so `nodeLinker: hoisted` is not needed for it. Switching a checkout between layouts leaves stale links (two copies of react-query, and "No QueryClient set" on every page): delete every `node_modules` folder (root, `apps/*`, `packages/*`, `infra`) before installing on the new layout, and regenerate `apps/mobile/android` with `expo prebuild --clean`. `react` and `react-dom` are pinned to the version Expo pins (19.2.3) everywhere and their types to `~19.2.2`, so the shared packages, which take React as a peer, resolve one React; upgrade React only together with the Expo SDK, and check with `npx expo-doctor` in `apps/mobile`.

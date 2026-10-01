# AGENTS.md

Guidance for coding agents working in this repository. Read [README.md](README.md) first: it covers what the app does, how to run it, the architecture and the repository layout. [docs/DECISIONS.md](docs/DECISIONS.md) records every design decision and where the build departs from the target; [docs/METHODOLOGY.md](docs/METHODOLOGY.md) defines the grids, slots and ensemble maths.

## Commands

```bash
pnpm install
cp .env.example .env         # once; the API, the collector and Prisma read the root .env
pnpm db:up                   # Postgres and Redis in Docker
pnpm db:deploy && pnpm db:seed
pnpm dev                     # API :4000 and web :3000
pnpm lint
pnpm knip                    # unused files, exports and dependencies (knip.jsonc)
pnpm typecheck
pnpm test                    # database tests run when DATABASE_URL is reachable, and are skipped otherwise
pnpm check:messages          # catalog key parity and literal key usage
pnpm build && pnpm e2e       # Playwright against a fake upstream and its own database (<DATABASE_URL>_e2e)
pnpm format
pnpm build                   # Next.js, the API and collector Lambda bundles, the Prisma client
pnpm collect [-- --cities a,b] [-- --loop]
pnpm import:csv -- <files>
pnpm db:migrate              # create a migration after editing packages/db/prisma/schema.prisma
pnpm cdk:synth               # also cdk:diff, cdk:deploy, cdk:bootstrap; needs pnpm build first
```

## Rules that must not break

- **UI kit.** Tailwind v4 and shadcn/ui only; no other component library. Colors, fonts and radii come from token-backed utilities (`apps/web/src/app/globals.css`), never literals in components. Dark mode is the `.dark` class on `<html>` (`packages/ui/src/lib/color-mode.ts`); charts re-read their colors when it changes.
- **Model palette.** `packages/shared/src/models.ts` fixes one color per model; never reassign it. ECMWF AIFS and met.no keep their dash patterns as a second encoding.
- **API contract.** The zod schemas in `packages/shared/src/api.ts` are the contract; change them first. The server returns stored data; the client derives medians, slots, labels and formatting with `packages/shared`.
- **Upstream calls.** The browser never calls Open-Meteo or met.no. The API proxies geocoding and performs preview fetches, and only calls upstream when a newer 6-hour run exists. Every upstream request made for a client spends its daily quota first (`packages/server/src/quota.ts`, DECISIONS P27).
- **Time.** Timestamps are UTC in storage and the API, and displayed in the city's local time.
- **Precipitation** is always present in the schema and the UI.
- **State.** Redux holds UI state only; TanStack Query holds server state. The landing overview's queries never refetch in the background, because a refetch re-anchors the chart; only Refresh does.
- **Catalogs.** `apps/web/messages/{uk,en,es,de,fr}.json` keep identical keys.
- **Shared server code.** Anything the API and the collector both need lives in `packages/server`; the apps stay thin entry points. Database access goes through `packages/server/src/store.ts`, shared expiring state through `packages/server/src/cache.ts`.
- **Redis is optional at runtime.** Every Redis call must degrade (no cache, no limit, lock granted) rather than fail a request (DECISIONS P31). Never add ElastiCache.
- **Schema changes** go through Prisma migrations in `packages/db`. `Forecast` is partitioned by week: keep `issueTime` in its primary key and never write to it without `ensureForecastPartitions` (the store does this).
- **Scope.** The MVP compares models with each other, not with observations. Truth, skill scores and the scoreboard are post-MVP (DECISIONS P17, P20).

## Conventions

- Packages ship TypeScript source through explicit `exports`; a new file in `packages/ui` or `packages/charts` needs an entry. Inside a package, import relatively; the `@/` alias exists only in `apps/web` (DECISIONS P29).
- Named exports only (`export function Name({ … }: IProps)` for components and hooks, arrow functions for everything else); `export default` only where a framework requires it (Next.js `page`, `layout`, `not-found`, config files, next-intl's `i18n/request.ts`). String unions for two or three options, enums for more (DECISIONS P38).
- One hook per file in a `hooks/` folder, with an explicit return type (an exported `UseXResult` interface when it returns an object). Code that reads no props, state or hook result lives at module scope; types used by more than one file live in the nearest `types.ts`.
- File names: components PascalCase, hooks camelCase, every other module kebab-case and named by what it holds (no `utils.ts`). Sizes are written in `rem` (design tokens in `globals.css` and arbitrary Tailwind values alike) so they follow the browser's font-size setting; hairlines, shadows and chart geometry stay in px.
- Formatting is Prettier (`.prettierrc`: 4 spaces, single quotes, no semicolons, width 120); linting is ESLint. Format only the files you touch.
- Phone layouts (below `sm`, 640 px) switch with `max-sm:` / `sm:` utilities, so the server HTML matches the first client render; a JS media query (`useMediaQuery`, written in `rem` like Tailwind's breakpoints) only where CSS can't do the job, such as not mounting a virtualized table while it is hidden (DECISIONS P37).
- Comments explain why, not what.
- Tests land with the code (`*.test.ts` next to the module).
- Commits follow Conventional Commits (`feat(scope): …`, `fix: …`, `docs: …`), one commit per distinct change.
- When a change affects a command, env variable, rule above or design decision, update README.md, docs/DECISIONS.md or this file in the same commit.

## Gotchas

- Next.js 16: route `params` is a Promise, and the `PageProps`/`RouteContext` types come from `next typegen` (run by `pnpm typecheck`).
- `METNO_USER_AGENT` must name a real contact; met.no throttles or blocks anonymous clients.
- After renaming message keys, the dev server can hot-reload a component before its catalog and log `MISSING_MESSAGE`; a full reload clears it.
- Recharts' `ResponsiveContainer` renders nothing while its container has zero width, for example in a hidden tab.
- `import` and `deploy` are built-in pnpm commands (`pnpm import` deletes and rewrites the lockfile), so scripts never use those names and root scripts call filtered packages through `pnpm --filter <pkg> run <script>`.
- pnpm passes a literal `--` through to the script: write `pnpm cdk:deploy --profile <name>`, not `pnpm cdk:deploy -- --profile <name>` (CDK would read the flags as stack names). The collector CLIs drop a stray `--`, so `pnpm collect -- --cities a,b` still works.
- `prisma generate` runs as `@fa/db`'s build step; Turbo runs it before any package's typecheck or test. After editing the schema, run `pnpm --filter @fa/db build` if the editor reports missing types.
- Local run archives land in `data/raw` at the repository root (git-ignored).
- `next.config` rewrites are fixed at build time; runtime routing (like forwarding `/api/*` to `API_ORIGIN`) belongs in `apps/web/src/proxy.ts`.
- The e2e suite runs the production web build: rebuild (`pnpm build`) after web changes before `pnpm e2e`.

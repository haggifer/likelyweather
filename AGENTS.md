<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md

Guidance for coding agents working in this repository. Read [README.md](README.md) first: it covers what the app does, how to run it, the target architecture and the prototype's layout. [docs/DECISIONS.md](docs/DECISIONS.md) records every design decision and where the prototype departs from the target; [docs/METHODOLOGY.md](docs/METHODOLOGY.md) defines the grids, slots and ensemble maths.

## Commands

```bash
pnpm dev                     # Next.js dev server; seed cities are created on first start
pnpm lint
pnpm typecheck               # next typegen, then tsc
pnpm test                    # Vitest
pnpm format                  # Prettier with organize-imports
pnpm collect [--cities a,b] [--loop]
pnpm seed [--force]
pnpm build
```

## Rules that must not break

- **UI kit.** Tailwind v4 and shadcn/ui only; no other component library. Colors, fonts and radii come from token-backed utilities (`src/app/globals.css`), never literals in components. Dark mode is the `.dark` class on `<html>` (`src/lib/colorMode.ts`); charts re-read their colors when it changes.
- **Model palette.** `src/shared/models.ts` fixes one color per model; never reassign it. ECMWF AIFS and met.no keep their dash patterns as a second encoding.
- **API contract.** The zod schemas in `src/shared/api.ts` are the contract; change them first. The server returns stored data; the client derives medians, slots, labels and formatting with `src/shared`.
- **Upstream calls.** The browser never calls Open-Meteo or met.no. The API proxies geocoding and performs preview fetches, and only calls upstream when a newer 6-hour run exists. Every upstream request made for a client spends its daily quota first (`src/server/quota.ts`, DECISIONS P27).
- **Time.** Timestamps are UTC in storage and the API, and displayed in the city's local time.
- **Precipitation** is always present in the schema and the UI.
- **State.** Redux holds UI state only; TanStack Query holds server state. The landing overview's queries never refetch in the background, because a refetch re-anchors the chart; only Refresh does.
- **Catalogs.** `messages/{uk,en,es,de,fr}.json` keep identical keys.
- **Stand-ins.** `src/server/store.ts` (JSON files for Postgres and S3) and `src/server/cache.ts` (for Redis) are swapped as modules; their callers don't change.
- **Scope.** The MVP compares models with each other, not with observations. Truth, skill scores and the scoreboard are post-MVP (DECISIONS P17, P20).

## Conventions

- Prototype folders map onto the target packages: `src/shared` is `packages/shared`, `src/charts` is `packages/charts`, `src/server` plus `src/app/api` are `apps/api` and `apps/collector` (DECISIONS P1).
- Components are `export default function Name` with `interface IProps`; everything else is an arrow function. String unions for two or three options, enums for more.
- Formatting is Prettier (`.prettierrc`: 4 spaces, single quotes, no semicolons, width 120); linting is ESLint. Format only the files you touch.
- Comments explain why, not what.
- Tests land with the code (`*.test.ts` next to the module).
- Commits follow Conventional Commits (`feat(scope): …`, `fix: …`, `docs: …`), one commit per distinct change.
- When a change affects a command, env variable, rule above or design decision, update README.md, docs/DECISIONS.md or this file in the same commit.

## Gotchas

- Next.js 16: route `params` is a Promise, and the `PageProps`/`RouteContext` types come from `next typegen` (run by `pnpm typecheck`).
- `METNO_USER_AGENT` must name a real contact; met.no throttles or blocks anonymous clients.
- After renaming message keys, the dev server can hot-reload a component before its catalog and log `MISSING_MESSAGE`; a full reload clears it.
- Recharts' `ResponsiveContainer` renders nothing while its container has zero width, for example in a hidden tab.
- `data/` is git-ignored local state; delete it to start clean.

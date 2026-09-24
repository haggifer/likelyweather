@AGENTS.md

# Forecast Arena

Ten forecasts, any city, and where they disagree. Public dashboard, no accounts.
Read docs/PROJECT_GUIDE.md before any task. Record decisions in docs/DECISIONS.md.

## Stack

Next.js App Router + Tailwind v4 + shadcn/ui (token system, dev-only Theme Lab) + Redux Toolkit (UI state) + TanStack Query (server state) + TanStack Table and Virtual + Recharts + D3 for hero charts + next-intl (uk, en, es, de, fr); Express 5 REST on AWS Lambda (Web Adapter) behind CloudFront; Prisma on Postgres (partitioned forecasts, Neon); Redis (Upstash) for cache, limits, and the collector lock; the collector as a scheduled Lambda function via EventBridge Scheduler; S3 raw archive; AWS CDK single stack; Amplify Hosting. pnpm + Turborepo monorepo.

## UI rules

This project uses Tailwind and shadcn/ui. Do NOT use Ant Design, MUI, or any other component kit here; the Ant Design instructions in the home CLAUDE.md do not apply to this repository.
Never hardcode colors, fonts, or radii in components; use token-backed utilities. Density and surface variants live in globals.css under data attributes. The model palette in packages/shared is fixed and never reassigned.
The Theme Lab (apps/web/src/theme, /theme-lab) is development-only behind NEXT_PUBLIC_THEME_LAB; it must never appear in a production bundle. The gallery renders a static dump and never fetches.

## Data rules

Timestamps in UTC in the database; display in city local time. The MVP compares models with each other, not with observations; accuracy (truth, skill, scoreboard) is post-MVP. Precipitation is always present in schema and UI. The browser never calls Open-Meteo or met.no; the API proxies geocoding and performs preview fetches.

## Commands

pnpm dev · pnpm db:migrate · pnpm db:seed · pnpm collect · pnpm import · pnpm test · pnpm e2e · pnpm lint · pnpm typecheck · pnpm format · pnpm check:messages · pnpm lab:dump · pnpm check:no-lab · pnpm cdk:synth · pnpm cdk:diff

## Conventions

Conventional Commits. Tests land with the code. Zod schemas in packages/shared are the API contract; the server returns stored data and the client derives medians, labels, slots and formatting. Redux holds UI state only; TanStack Query holds server state. All five message catalogs keep identical keys. Copy logic from the weather-forecast-collector skill when useful; never depend on it at runtime. No Google Drive.

## Prototype status (read this first)

This repository is currently the single-app prototype described in docs/DECISIONS.md, not yet the monorepo above. Where the two differ, the prototype mapping is:

- `src/shared` = packages/shared (zod contract, model palette, variables, ensemble math, resampling, 3-hour slots). `src/charts` = packages/charts. `src/theme` = the Theme Lab.
- `src/server` + `src/app/api/**/route.ts` = apps/api and apps/collector (same REST contract, Next route handlers instead of Express).
- `src/server/store.ts` (JSON files under `data/`) stands in for Postgres/Prisma and S3; `src/server/cache.ts` stands in for Redis. Swap those modules, not their callers. A snapshot holds the 6-hour grid plus an `hourly` grid.
- Scope is forecasts only (DECISIONS P17, P20): no truth, skill, scoreboard, model detail or evolution view, and no Previous Runs API. City pages have no section tabs; the variable switch sits in the dashboard body.
- The landing overview is anchored to the local 3-hour slot the data arrived in and refetches only on Refresh (DECISIONS P18, P19).
- Prototype commands: pnpm dev · pnpm collect [--cities a,b] [--loop] · pnpm seed [--force] · pnpm test · pnpm lint · pnpm typecheck · pnpm format · pnpm theme:export [--preset x] · pnpm lab:dump [--city slug] · pnpm check:no-lab (after a build with NEXT_PUBLIC_THEME_LAB=0). `pnpm check:messages` is specified but not written yet.
- The Theme Lab gallery never fetches: it renders `src/fixtures/lab-dump.json` through presentational components. Keep gallery components prop-driven and refresh the dump with `pnpm lab:dump` when API shapes change.
- UI languages: uk, en, es, de, fr (`messages/*.json`, all five must keep identical keys).
- Code style: Prettier config in .prettierrc (4 spaces, single quotes, no semicolons, organize-imports plugin). Run `pnpm format` before committing.

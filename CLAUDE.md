@AGENTS.md

# Forecast Arena

Ten forecasts, any city, a scoreboard of who was right. Public dashboard, no accounts.
Read docs/PROJECT_GUIDE.md before any task. Record decisions in docs/DECISIONS.md.

## Stack
Next.js App Router + Tailwind v4 + shadcn/ui (token system, dev-only Theme Lab) + Redux Toolkit (UI state) + TanStack Query (server state) + TanStack Table and Virtual + Recharts + D3 for hero charts + next-intl; Express 5 REST on AWS Lambda (Web Adapter) behind CloudFront; Prisma on Postgres (partitioned forecasts, Neon); Redis (Upstash) for cache, limits, and the collector lock; collector and skill job as scheduled Lambda functions via EventBridge Scheduler; S3 raw archive; AWS CDK single stack; Amplify Hosting. pnpm + Turborepo monorepo.

## UI rules
This project uses Tailwind and shadcn/ui. Do NOT use Ant Design, MUI, or any other component kit here; the Ant Design instructions in the home CLAUDE.md do not apply to this repository.
Never hardcode colors, fonts, or radii in components; use token-backed utilities. Density and surface variants live in globals.css under data attributes. The model palette in packages/shared is fixed and never reassigned.
The Theme Lab (apps/web/src/theme, /theme-lab) is development-only behind NEXT_PUBLIC_THEME_LAB; it must never appear in a production bundle.

## Data rules
Timestamps in UTC in the database; display in city local time. Truth is model analysis, not observations; say so wherever skill is shown. Cells with fewer than 20 samples are excluded from rankings. Precipitation is always present in schema and UI. The browser never calls Open-Meteo or met.no; the API proxies geocoding and performs preview fetches.

## Commands
pnpm dev · pnpm db:migrate · pnpm db:seed · pnpm collect · pnpm import · pnpm skill · pnpm test · pnpm e2e · pnpm lint · pnpm typecheck · pnpm cdk:synth · pnpm cdk:diff

## Conventions
Conventional Commits. Tests land with the code. Zod schemas in packages/shared are the API contract; the server returns stored or aggregated data and the client derives labels (documented exception: disagreement.label). Redux holds UI state only; TanStack Query holds server state. Copy logic from the weather-forecast-collector skill when useful; never depend on it at runtime. No Google Drive.

## Prototype status (read this first)
This repository is currently the single-app prototype described in docs/DECISIONS.md, not yet the monorepo above. Where the two differ, the prototype mapping is:
- `src/shared` = packages/shared (zod contract, model palette, ensemble math). `src/charts` = packages/charts. `src/theme` = the Theme Lab.
- `src/server` + `src/app/api/**/route.ts` = apps/api, apps/collector and apps/skill-job (same REST contract, Next route handlers instead of Express).
- `src/server/store.ts` (JSON files under `data/`) stands in for Postgres/Prisma and S3; `src/server/cache.ts` stands in for Redis. Swap those modules, not their callers.
- Skill and evolution come from Open-Meteo's Previous Runs API (lead buckets 24/48/72/96 h); disagreement labels are derived client-side, so the disagreement.label exception is not used.
- Prototype commands: pnpm dev · pnpm collect [--cities a,b] [--loop] · pnpm seed [--force] · pnpm test · pnpm lint · pnpm typecheck · pnpm format · pnpm theme:export [--preset x] · pnpm check:no-lab (after a build with NEXT_PUBLIC_THEME_LAB=0).
- Code style: Prettier config in .prettierrc (4 spaces, single quotes, no semicolons, organize-imports plugin). Run `pnpm format` before committing.

import { defineConfig } from 'vitest/config'

// Tests use the in-memory cache, never the developer's Redis. The database suites share one database and clear its
// tables, so the files run one at a time: in parallel they deadlock under load. A busy machine (`pnpm test` runs every
// package at once) slows a database test past Vitest's 5-second default.
export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        include: ['src/**/*.test.ts'],
        env: { REDIS_URL: '' },
        fileParallelism: false,
        testTimeout: 15_000,
    },
})

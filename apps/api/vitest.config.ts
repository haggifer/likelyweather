import { defineConfig } from 'vitest/config'

// Tests use the in-memory cache, never the developer's Redis.
export default defineConfig({
    test: { environment: 'node', globals: true, include: ['src/**/*.test.ts'], env: { REDIS_URL: '' } },
})

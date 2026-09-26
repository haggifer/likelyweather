import { defineConfig, devices } from '@playwright/test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { parseEnv } from 'node:util'

const FAKE = 'http://localhost:4010'
const API_PORT = 4100
const WEB_PORT = 3100
const isCi = Boolean(process.env.CI)

const readRootEnv = (): Record<string, string> => {
    try {
        return parseEnv(readFileSync(path.resolve(import.meta.dirname, '../../.env'), 'utf8')) as Record<string, string>
    } catch {
        return {}
    }
}

// The development database with an `_e2e` suffix, unless E2E_DATABASE_URL names one.
const baseUrl = new URL(
    process.env.DATABASE_URL ??
        readRootEnv().DATABASE_URL ??
        'postgresql://postgres:postgres@localhost:5432/forecastarena',
)
baseUrl.pathname = `${baseUrl.pathname}_e2e`
export const E2E_DATABASE_URL = process.env.E2E_DATABASE_URL ?? baseUrl.toString()

// The API and the web app run against the fake upstream, so no test reaches Open-Meteo or met.no. The API keeps
// its quota and caches in memory (empty REDIS_URL), so every run starts with a full quota.
export default defineConfig({
    testDir: 'tests',
    globalSetup: './global-setup.ts',
    timeout: 60_000,
    expect: { timeout: 20_000 },
    retries: isCi ? 1 : 0,
    workers: 1,
    reporter: isCi ? [['github'], ['html', { open: 'never' }]] : 'list',
    use: { baseURL: `http://localhost:${WEB_PORT}`, trace: 'retain-on-failure' },
    projects: [
        { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
        { name: 'phone', use: { ...devices['Pixel 7'] } },
    ],
    webServer: [
        { command: 'node fake-upstream.mjs', url: `${FAKE}/v1/search?name=x`, reuseExistingServer: !isCi },
        {
            command: 'pnpm --filter @fa/api exec tsx src/server.ts',
            url: `http://localhost:${API_PORT}/api/models`,
            reuseExistingServer: !isCi,
            env: {
                API_PORT: String(API_PORT),
                DATABASE_URL: E2E_DATABASE_URL,
                REDIS_URL: '',
                DISABLE_RATE_LIMITS: '1',
                OPEN_METEO_FORECAST_BASE: FAKE,
                OPEN_METEO_GEOCODING_BASE: FAKE,
                METNO_BASE: FAKE,
                LOG_LEVEL: 'warn',
            },
        },
        {
            // The production build (run `pnpm build` first): closer to what ships, and Next.js allows only one dev
            // server per app, which local development already uses.
            command: `pnpm --filter @fa/web exec next start --port ${WEB_PORT}`,
            url: `http://localhost:${WEB_PORT}`,
            reuseExistingServer: !isCi,
            timeout: 180_000,
            env: { API_ORIGIN: `http://localhost:${API_PORT}` },
        },
    ],
})

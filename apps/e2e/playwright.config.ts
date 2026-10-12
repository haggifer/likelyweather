import { defineConfig, devices } from '@playwright/test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { parseEnv } from 'node:util'

const FAKE = 'http://localhost:4010'
const API_PORT = 4100
const WEB_PORT = 3100
const IS_CI = Boolean(process.env.CI)

const readRootEnv = (): Record<string, string> => {
    try {
        return parseEnv(readFileSync(path.resolve(import.meta.dirname, '../../.env'), 'utf8')) as Record<string, string>
    } catch {
        return {}
    }
}

const getSuffixedDatabaseUrl = () => {
    const url = new URL(
        process.env.DATABASE_URL ??
            readRootEnv().DATABASE_URL ??
            'postgresql://postgres:postgres@localhost:5432/forecastarena',
    )

    url.pathname = `${url.pathname}_e2e`

    return url.toString()
}

const SUFFIXED_DATABASE_URL = getSuffixedDatabaseUrl()

// The development database with an `_e2e` suffix, unless E2E_DATABASE_URL names one.
export const E2E_DATABASE_URL = process.env.E2E_DATABASE_URL ?? SUFFIXED_DATABASE_URL

// The API and the web app run against the fake upstream, so no test reaches Open-Meteo or met.no. The API keeps
// its quota and caches in memory (empty REDIS_URL), so every run starts with a full quota.
export default defineConfig({
    testDir: 'tests',
    globalSetup: './global-setup.ts',
    timeout: 60_000,
    expect: { timeout: 20_000 },
    retries: IS_CI ? 1 : 0,
    forbidOnly: IS_CI,
    workers: 1,
    reporter: IS_CI ? [['github'], ['html', { open: 'never' }]] : 'list',
    use: { baseURL: `http://localhost:${WEB_PORT}`, trace: 'retain-on-failure' },
    projects: [
        { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
        { name: 'phone', use: { ...devices['Pixel 7'] } },
    ],
    webServer: [
        { command: 'node fake-upstream.mjs', url: `${FAKE}/v1/search?name=x`, reuseExistingServer: !IS_CI },
        {
            command: 'pnpm --filter @fa/api exec tsx src/server.ts',
            url: `http://localhost:${API_PORT}/api/models`,
            reuseExistingServer: !IS_CI,
            env: {
                API_PORT: String(API_PORT),
                DATABASE_URL: E2E_DATABASE_URL,
                REDIS_URL: '',
                DISABLE_RATE_LIMITS: '1',
                OPEN_METEO_FORECAST_BASE: FAKE,
                OPEN_METEO_GEOCODING_BASE: FAKE,
                OPEN_METEO_ARCHIVE_BASE: FAKE,
                METNO_BASE: FAKE,
                LOG_LEVEL: 'warn',
            },
        },
        {
            // The standalone server the Lambda runs, as `pnpm build` leaves it (with the static files and public copied
            // in by build-lambda.mjs), so a file missing from Next.js's tracing fails here too. Next.js also allows only
            // one dev server per app, which local development already uses.
            command: 'node .next/standalone/apps/web/server.js',
            cwd: '../web',
            url: `http://localhost:${WEB_PORT}`,
            reuseExistingServer: !IS_CI,
            timeout: 180_000,
            env: { PORT: String(WEB_PORT), HOSTNAME: 'localhost', API_ORIGIN: `http://localhost:${API_PORT}` },
        },
    ],
})

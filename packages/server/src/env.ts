import { loadLocalEnv } from '@fa/db/client'
import { z } from 'zod'

const DEFAULT_METNO_USER_AGENT = 'forecast-arena/1.0 (no contact configured)'

const EnvSchema = z.object({
    OPEN_METEO_FORECAST_BASE: z.url().default('https://api.open-meteo.com'),
    OPEN_METEO_GEOCODING_BASE: z.url().default('https://geocoding-api.open-meteo.com'),
    METNO_BASE: z.url().default('https://api.met.no'),
    METNO_USER_AGENT: z.string().min(8).default(DEFAULT_METNO_USER_AGENT),
    // Without it the caches, limits and claims live in process memory (tests, quick local runs).
    REDIS_URL: z.string().optional(),
    RETENTION_DAYS: z.coerce.number().int().positive().default(14),
})

// On AWS (SSM_PREFIX set) the SSM parameters must be there: met.no throttles the anonymous default, and without
// Redis every Lambda instance would keep its own quota and rate limits, so the app-wide cap would not hold.
const checkDeployedEnv = (parsed: z.infer<typeof EnvSchema>) => {
    if (!process.env.SSM_PREFIX) return

    if (parsed.METNO_USER_AGENT === DEFAULT_METNO_USER_AGENT) {
        throw new Error('METNO_USER_AGENT is not set under SSM_PREFIX; met.no needs a real contact')
    }

    if (!parsed.REDIS_URL) console.warn('REDIS_URL is not set under SSM_PREFIX: limits and the quota are per instance')
}

loadLocalEnv()

export const env = EnvSchema.parse(process.env)

checkDeployedEnv(env)

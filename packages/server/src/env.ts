import { loadLocalEnv } from '@fa/db/client'
import { z } from 'zod'

const EnvSchema = z.object({
    OPEN_METEO_FORECAST_BASE: z.url().default('https://api.open-meteo.com'),
    OPEN_METEO_GEOCODING_BASE: z.url().default('https://geocoding-api.open-meteo.com'),
    METNO_BASE: z.url().default('https://api.met.no'),
    METNO_USER_AGENT: z.string().min(8).default('forecast-arena/1.0 (no contact configured)'),
    // Without it the cache, limits and lock live in process memory (tests, quick local runs).
    REDIS_URL: z.string().optional(),
    ACTIVE_CITY_CAP: z.coerce.number().int().positive().default(300),
    DORMANT_AFTER_DAYS: z.coerce.number().int().positive().default(30),
    RETENTION_DAYS: z.coerce.number().int().positive().default(14),
})

loadLocalEnv()

export const env = EnvSchema.parse(process.env)

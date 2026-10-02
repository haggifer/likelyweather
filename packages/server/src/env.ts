import { loadLocalEnv } from '@fa/db/client'
import path from 'node:path'
import { z } from 'zod'

const REPO_ROOT = path.resolve(import.meta.dirname, '../../..')

const EnvSchema = z.object({
    OPEN_METEO_FORECAST_BASE: z.url().default('https://api.open-meteo.com'),
    OPEN_METEO_GEOCODING_BASE: z.url().default('https://geocoding-api.open-meteo.com'),
    METNO_BASE: z.url().default('https://api.met.no'),
    METNO_USER_AGENT: z.string().min(8).default('forecast-arena/1.0 (no contact configured)'),
    // Without it the cache, limits and lock live in process memory (tests, quick local runs).
    REDIS_URL: z.string().optional(),
    RAW_DIR: z.string().default('./data/raw'),
    // Set on AWS: raw archives go to this bucket instead of RAW_DIR.
    RAW_BUCKET: z.string().optional(),
    AWS_REGION: z.string().default('eu-central-1'),
    ACTIVE_CITY_CAP: z.coerce.number().int().positive().default(300),
    DORMANT_AFTER_DAYS: z.coerce.number().int().positive().default(30),
    RETENTION_DAYS: z.coerce.number().int().positive().default(14),
})

loadLocalEnv()

const parsed = EnvSchema.parse(process.env)

// A relative RAW_DIR is anchored at the repository root, so the API and the collector share one archive locally.
export const env = { ...parsed, RAW_DIR: path.resolve(REPO_ROOT, parsed.RAW_DIR) }

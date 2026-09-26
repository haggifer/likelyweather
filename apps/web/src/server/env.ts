import path from 'node:path'
import { z } from 'zod'

const EnvSchema = z.object({
    OPEN_METEO_FORECAST_BASE: z.url().default('https://api.open-meteo.com'),
    OPEN_METEO_GEOCODING_BASE: z.url().default('https://geocoding-api.open-meteo.com'),
    METNO_BASE: z.url().default('https://api.met.no'),
    METNO_USER_AGENT: z.string().min(8).default('forecast-arena/0.1 (prototype)'),
    DATA_DIR: z.string().default('./data'),
    ACTIVE_CITY_CAP: z.coerce.number().int().positive().default(300),
    DORMANT_AFTER_DAYS: z.coerce.number().int().positive().default(30),
})

const parsed = EnvSchema.parse(process.env)

export const env = { ...parsed, DATA_DIR: path.resolve(/* turbopackIgnore: true */ process.cwd(), parsed.DATA_DIR) }

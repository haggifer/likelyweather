import { z } from 'zod'
import { ModelId } from './models'
import { Variable } from './variables'

export enum Locale {
    Uk = 'uk',
    En = 'en',
    Es = 'es',
    De = 'de',
    Fr = 'fr',
    Ru = 'ru',
}

export const LOCALES: Locale[] = Object.values(Locale)
export const DEFAULT_LOCALE = Locale.En

const NumberList = z.array(z.number().nullable())

export const VariableSchema = z.enum(Variable)
export const ModelIdSchema = z.enum(ModelId)
export const LocaleSchema = z.enum(Locale)

export const GeocodeQuerySchema = z.strictObject({
    q: z.string().trim().min(3).max(64),
    locale: LocaleSchema.optional(),
})

export const GeocodeResultSchema = z.object({
    id: z.number(),
    name: z.string(),
    admin1: z.string().optional(),
    country: z.string(),
    countryCode: z.string(),
    lat: z.number(),
    lon: z.number(),
    elevationM: z.number().optional(),
    timezone: z.string(),
    population: z.number().optional(),
})
export type GeocodeResult = z.infer<typeof GeocodeResultSchema>

export const GeocodeResponseSchema = z.object({ results: z.array(GeocodeResultSchema) })
export type GeocodeResponse = z.infer<typeof GeocodeResponseSchema>

export const TrackBodySchema = z.strictObject({
    // Open-Meteo geocoding ids fit Postgres INT4, the column type.
    geocodeId: z.number().int().positive().max(2_147_483_647),
    locale: LocaleSchema.optional(),
})

export const TrackResponseSchema = z.object({ slug: z.string() })
export type TrackResponse = z.infer<typeof TrackResponseSchema>

export const CitySchema = z.object({
    id: z.number(),
    slug: z.string(),
    name: z.string(),
    nameLocal: z.partialRecord(LocaleSchema, z.string()).optional(),
    admin1: z.string().optional(),
    country: z.string(),
    countryCode: z.string(),
    lat: z.number(),
    lon: z.number(),
    elevationM: z.number().optional(),
    timezone: z.string(),
    population: z.number().optional(),
})
export type City = z.infer<typeof CitySchema>

export const StartersResponseSchema = z.object({ items: z.array(CitySchema) })
export type StartersResponse = z.infer<typeof StartersResponseSchema>

export const NearestQuerySchema = z.strictObject({
    lat: z.coerce.number().min(-90).max(90),
    lon: z.coerce.number().min(-180).max(180),
})

export const NearestResponseSchema = z.object({ city: CitySchema, distanceKm: z.number() })
export type NearestResponse = z.infer<typeof NearestResponseSchema>

export const LatestQuerySchema = z.strictObject({
    variable: VariableSchema.default(Variable.Temp),
})

export const QuotaResponseSchema = z.object({ limit: z.number(), used: z.number(), resetsAt: z.string() })
export type QuotaResponse = z.infer<typeof QuotaResponseSchema>

export const SeriesSchema = z.object({ modelId: ModelIdSchema, values: NumberList })
export type Series = z.infer<typeof SeriesSchema>

export const LatestResponseSchema = z.object({
    issueTime: z.string(),
    fetchedAt: z.string(),
    runId: z.string(),
    steps: z.array(z.string()),
    series: z.array(SeriesSchema),
    directions: z.array(SeriesSchema).optional(),
})
export type LatestResponse = z.infer<typeof LatestResponseSchema>

// The temperature now: a nearby station's last reading carried forward by the models' change since, or the models'
// value for the current quarter hour when no station qualifies.
export const CurrentResponseSchema = z.object({
    temp: z.number(),
    source: z.enum(['station', 'model']),
    // When the reading (or the model value) the temperature starts from is for.
    observedAt: z.string(),
    station: z.object({ id: z.string(), name: z.string(), distanceKm: z.number() }).optional(),
})
export type CurrentResponse = z.infer<typeof CurrentResponseSchema>

const DateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

// A city's past weather for whole local days (`archive.ts` holds the range rules the API checks).
export const ArchiveQuerySchema = z.strictObject({ from: DateKey, to: DateKey })

// Hourly, in UTC, one value list per field (`ARCHIVE_FIELDS` in archive.ts); precipitation is the hour ending at the
// step, as in the forecasts.
export const ArchiveResponseSchema = z.object({
    from: z.string(),
    to: z.string(),
    steps: z.array(z.string()),
    values: z.object({
        temp: NumberList,
        feels: NumberList,
        wind: NumberList,
        gusts: NumberList,
        windDir: NumberList,
        pressure: NumberList,
        precip: NumberList,
        humidity: NumberList,
        cloud: NumberList,
    }),
})
export type ArchiveResponse = z.infer<typeof ArchiveResponseSchema>

export const HealthResponseSchema = z.object({ ok: z.boolean(), cities: z.number() })
export type HealthResponse = z.infer<typeof HealthResponseSchema>

export interface ApiError {
    error: { code: string; message: string }
}

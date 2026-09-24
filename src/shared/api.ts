import { EVOLUTION_MAX_DAYS, LEAD_BUCKETS, MAX_COMPARE_CITIES, SKILL_WINDOWS } from '@/shared/constants'
import { ModelId } from '@/shared/models'
import { Variable } from '@/shared/variables'
import { z } from 'zod'

export enum CityStatus {
    Active = 'ACTIVE',
    Dormant = 'DORMANT',
    Queued = 'QUEUED',
}

export type RunStatus = 'OK' | 'PARTIAL' | 'FAILED'
export type RunOrigin = 'SCHEDULED' | 'PREVIEW' | 'IMPORT'
export type TruthMode = 'consensus' | 'self'
export type Locale = 'en' | 'uk'

export const LOCALES: Locale[] = ['en', 'uk']

const NumberList = z.array(z.number().nullable())

export const VariableSchema = z.enum(Variable)
export const ModelIdSchema = z.enum(ModelId)
export const LocaleSchema = z.enum(['en', 'uk'])
export const TruthModeSchema = z.enum(['consensus', 'self'])
export const WindowSchema = z.coerce.number().pipe(z.literal(SKILL_WINDOWS))
export const LeadBucketSchema = z.coerce.number().pipe(z.literal(LEAD_BUCKETS))
const IsoTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?Z$/)

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
    geocodeId: z.number().int().positive(),
    locale: LocaleSchema.optional(),
})

export const TrackResponseSchema = z.object({
    slug: z.string(),
    status: z.enum(CityStatus),
    previewRunId: z.string().nullable(),
})
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
    status: z.enum(CityStatus),
    availableModels: z.array(ModelIdSchema),
    firstTrackedAt: z.string(),
    lastViewedAt: z.string(),
    viewCount: z.number(),
    runsCollected: z.number(),
})
export type City = z.infer<typeof CitySchema>

export const CityDetailSchema = CitySchema.extend({
    latestIssueTime: z.string().nullable(),
    isPreviewOnly: z.boolean(),
})
export type CityDetail = z.infer<typeof CityDetailSchema>

export const CitiesQuerySchema = z.strictObject({
    status: z.enum(CityStatus).optional(),
})

export const PopularQuerySchema = z.strictObject({
    limit: z.coerce.number().int().min(1).max(24).default(6),
})

export const VariableQuerySchema = z.strictObject({
    variable: VariableSchema.default(Variable.Temp),
})

export const SeriesSchema = z.object({ modelId: ModelIdSchema, values: NumberList })
export type Series = z.infer<typeof SeriesSchema>

export const LatestResponseSchema = z.object({
    issueTime: z.string(),
    fetchedAt: z.string(),
    origin: z.enum(['SCHEDULED', 'PREVIEW', 'IMPORT']),
    runId: z.string(),
    steps: z.array(z.string()),
    series: z.array(SeriesSchema),
    directions: z.array(SeriesSchema).optional(),
})
export type LatestResponse = z.infer<typeof LatestResponseSchema>

export const ScoreboardQuerySchema = z.strictObject({
    variable: VariableSchema.default(Variable.Temp),
    window: WindowSchema.default(30),
    mode: TruthModeSchema.default('consensus'),
})

export const ErrorSampleSchema = z.object({
    validTime: z.string(),
    forecast: z.number(),
    truth: z.number(),
    error: z.number(),
})
export type ErrorSample = z.infer<typeof ErrorSampleSchema>

export const SkillCellSchema = z.object({
    modelId: ModelIdSchema,
    leadBucket: z.number(),
    n: z.number(),
    mae: z.number().nullable(),
    bias: z.number().nullable(),
    rmse: z.number().nullable(),
    hitRate: z.number().nullable().optional(),
    spark: NumberList,
    worst: z.array(ErrorSampleSchema),
})
export type SkillCell = z.infer<typeof SkillCellSchema>

export const ScoreboardResponseSchema = z.object({
    minN: z.number(),
    days: z.array(z.string()),
    daysCollected: z.number(),
    cells: z.array(SkillCellSchema),
})
export type ScoreboardResponse = z.infer<typeof ScoreboardResponseSchema>

export const EvolutionQuerySchema = z.strictObject({
    variable: VariableSchema.default(Variable.Temp),
    validTime: IsoTime,
})

export const EvolutionPointSchema = z.object({
    modelId: ModelIdSchema,
    leadDays: z.number().int().min(0).max(EVOLUTION_MAX_DAYS),
    value: z.number(),
})
export type EvolutionPoint = z.infer<typeof EvolutionPointSchema>

export const EvolutionResponseSchema = z.object({
    validTime: z.string(),
    points: z.array(EvolutionPointSchema),
    truth: z.number().nullable(),
})
export type EvolutionResponse = z.infer<typeof EvolutionResponseSchema>

export const StepsResponseSchema = z.object({ steps: z.array(z.string()) })
export type StepsResponse = z.infer<typeof StepsResponseSchema>

export const ModelDetailQuerySchema = z.strictObject({
    variable: VariableSchema.default(Variable.Temp),
    window: WindowSchema.default(30),
    city: z.string().optional(),
})

export const ModelDetailResponseSchema = z.object({
    cities: z.array(
        z.object({
            slug: z.string(),
            name: z.string(),
            biasDaily: z.array(z.object({ day: z.string(), bias: z.number().nullable(), n: z.number() })),
            errorByLead: z.array(z.object({ leadBucket: z.number(), mae: z.number().nullable(), n: z.number() })),
        }),
    ),
    worst: z.array(ErrorSampleSchema.extend({ slug: z.string(), leadBucket: z.number() })),
})
export type ModelDetailResponse = z.infer<typeof ModelDetailResponseSchema>

export const CompareQuerySchema = z.strictObject({
    cities: z
        .string()
        .transform((v) => v.split(',').filter(Boolean))
        .pipe(z.array(z.string()).min(1).max(MAX_COMPARE_CITIES)),
    variable: VariableSchema.default(Variable.Temp),
})

export const CompareResponseSchema = z.object({
    items: z.array(z.object({ city: CitySchema, latest: LatestResponseSchema.nullable() })),
})
export type CompareResponse = z.infer<typeof CompareResponseSchema>

export const RunSchema = z.object({
    id: z.string(),
    issueTime: z.string(),
    origin: z.enum(['SCHEDULED', 'PREVIEW', 'IMPORT']),
    cityId: z.number().nullable(),
    startedAt: z.string(),
    finishedAt: z.string().nullable(),
    status: z.enum(['OK', 'PARTIAL', 'FAILED']),
    rows: z.number(),
    citiesCount: z.number(),
    warnings: z.array(z.string()),
    archivePath: z.string().nullable(),
})
export type Run = z.infer<typeof RunSchema>

export const RunsQuerySchema = z.strictObject({
    limit: z.coerce.number().int().min(1).max(500).default(200),
    cursor: z.string().optional(),
})

export const RunsResponseSchema = z.object({ items: z.array(RunSchema), nextCursor: z.string().optional() })
export type RunsResponse = z.infer<typeof RunsResponseSchema>

export const TimelineQuerySchema = z.strictObject({
    days: z.coerce.number().int().min(1).max(90).default(30),
})

export const TimelineResponseSchema = z.object({
    from: z.string(),
    to: z.string(),
    runs: z.array(RunSchema.pick({ id: true, issueTime: true, status: true, origin: true })),
})
export type TimelineResponse = z.infer<typeof TimelineResponseSchema>

export const HealthResponseSchema = z.object({
    ok: z.boolean(),
    latestIssueTime: z.string().nullable(),
    lagMinutes: z.number().nullable(),
    activeCities: z.number(),
})
export type HealthResponse = z.infer<typeof HealthResponseSchema>

export interface ApiError {
    error: { code: string; message: string }
}

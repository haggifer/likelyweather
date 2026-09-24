import { City, CityStatus, LatestResponse, SkillCell } from '@/shared/api'
import { LEAD_BUCKETS } from '@/shared/constants'
import { ModelId, MODELS } from '@/shared/models'
import { addHours, buildSteps, floorToStep } from '@/shared/time'

// Deterministic synthetic data for the /theme-lab gallery, so designs are compared on stable shapes.
const ISSUE = floorToStep(new Date())
const STEPS = buildSteps(addHours(ISSUE, -24), addHours(ISSUE, 96))
const OFFSETS = [0, 0.6, 1.4, -0.9, 0.3, -0.4, 1.1, 2.2, -1.6, 0.1]

const wave = (i: number, offset: number, spread: number) =>
    Math.round((13 + 6 * Math.sin(((i - 3) / 4) * Math.PI) + offset * (1 + spread * i * 0.08)) * 10) / 10

const rain = (i: number, m: number) => {
    const base = Math.max(0, 4 * Math.sin(((i - 8) / 5) * Math.PI) + (m % 3) - 1)
    return Math.round(base * 10) / 10
}

export const GALLERY_CITY: City = {
    id: 706483,
    slug: 'kharkiv-ua-706483',
    name: 'Kharkiv',
    nameLocal: { uk: 'Харків' },
    admin1: 'Kharkiv Oblast',
    country: 'Ukraine',
    countryCode: 'UA',
    lat: 49.98,
    lon: 36.25,
    timezone: 'Europe/Kyiv',
    population: 1421125,
    status: CityStatus.Active,
    availableModels: MODELS.map((m) => m.id),
    firstTrackedAt: ISSUE.toISOString(),
    lastViewedAt: ISSUE.toISOString(),
    viewCount: 12,
    runsCollected: 4,
}

export const GALLERY_LATEST: LatestResponse = {
    issueTime: ISSUE.toISOString(),
    fetchedAt: ISSUE.toISOString(),
    origin: 'SCHEDULED',
    runId: 'gallery',
    steps: STEPS,
    series: MODELS.map((m, mi) => ({
        modelId: m.id,
        values: STEPS.map((_, i) => wave(i, OFFSETS[mi], 0.6)),
    })),
}

export const GALLERY_PRECIP: LatestResponse = {
    ...GALLERY_LATEST,
    series: MODELS.map((m, mi) => ({ modelId: m.id, values: STEPS.map((_, i) => rain(i, mi)) })),
}

export const GALLERY_CELLS: SkillCell[] = MODELS.filter((m) => m.source === 'open-meteo').flatMap((m, mi) =>
    LEAD_BUCKETS.map((leadBucket, li) => {
        const mae = Math.round((0.7 + li * 0.35 + Math.abs(OFFSETS[mi]) * 0.25) * 100) / 100

        return {
            modelId: m.id,
            leadBucket,
            n: m.id === ModelId.Cma && leadBucket === 96 ? 12 : 120,
            mae,
            bias: Math.round(OFFSETS[mi] * 0.4 * 100) / 100,
            rmse: Math.round(mae * 1.28 * 100) / 100,
            spark: Array.from({ length: 30 }, (_, d) => Math.round((mae + 0.3 * Math.sin(d / 3 + mi)) * 100) / 100),
            worst: STEPS.slice(0, 4).map((validTime, w) => ({
                validTime,
                forecast: 14 + w,
                truth: 11 + w * 0.5,
                error: 3 + w * 0.5,
            })),
        }
    }),
)

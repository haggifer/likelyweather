import { collectErrors, computeConsensusTruth, computeSkillCells, getWorst, summarizeErrors } from '@/server/skill'
import { fetchPreviousRuns } from '@/server/sources/previousRuns'
import { City, EvolutionResponse, ModelDetailResponse, ScoreboardResponse, TruthMode } from '@/shared/api'
import {
    EVOLUTION_MAX_DAYS,
    FORECAST_HOURS,
    LEAD_BUCKETS,
    MIN_SAMPLES,
    MIN_TRUTH_CONTRIBUTORS,
    SkillWindow,
} from '@/shared/constants'
import { median } from '@/shared/ensemble'
import { ModelId, MODELS } from '@/shared/models'
import { addHours, buildSteps, floorToStep, toUtcDate } from '@/shared/time'
import { Variable } from '@/shared/variables'
import { sortBy } from 'es-toolkit'

const DAY_MS = 86_400_000
const EVOLUTION_PAST_HOURS = 72
const MODEL_DETAIL_CITIES = 6

export const getWindowRange = (window: SkillWindow, now: Date) => {
    const to = floorToStep(now)
    const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    const from = new Date(today - (window - 1) * DAY_MS)
    const days = Array.from({ length: window }, (_, i) => toUtcDate(new Date(from.getTime() + i * DAY_MS)))

    return { from, to, days }
}

export const getScoreboard = async (
    city: City,
    variable: Variable,
    window: SkillWindow,
    mode: TruthMode,
    now = new Date(),
): Promise<ScoreboardResponse> => {
    const { from, to, days } = getWindowRange(window, now)
    const data = await fetchPreviousRuns({
        lat: city.lat,
        lon: city.lon,
        variable,
        from,
        to,
        maxLeadDay: LEAD_BUCKETS.length,
    })
    const consensus = computeConsensusTruth(data)
    const daysWithTruth = new Set(data.steps.filter((_, i) => consensus[i] !== null).map((s) => s.slice(0, 10)))

    return {
        minN: MIN_SAMPLES,
        days,
        daysCollected: daysWithTruth.size,
        cells: computeSkillCells(data, variable, mode, days, now),
    }
}

export const getEvolutionSteps = (now = new Date()) =>
    buildSteps(addHours(now, -EVOLUTION_PAST_HOURS), addHours(floorToStep(now), FORECAST_HOURS))

export const getEvolution = async (
    city: City,
    variable: Variable,
    validTime: string,
    now = new Date(),
): Promise<EvolutionResponse> => {
    const at = new Date(validTime)
    const data = await fetchPreviousRuns({
        lat: city.lat,
        lon: city.lon,
        variable,
        from: at,
        to: at,
        maxLeadDay: EVOLUTION_MAX_DAYS,
    })
    const points = (Object.entries(data.models) as [ModelId, (number | null)[][]][]).flatMap(([modelId, byDay]) =>
        byDay
            .map((values, leadDays) => ({ modelId, leadDays, value: values[0] }))
            .filter((p): p is { modelId: ModelId; leadDays: number; value: number } => p.value !== null),
    )
    const analyses = points.filter((p) => p.leadDays === 0).map((p) => p.value)
    const truth = at <= now && analyses.length >= MIN_TRUTH_CONTRIBUTORS ? median(analyses) : null

    return { validTime, points, truth }
}

export const pickModelDetailCities = (cities: City[], slug?: string) => {
    const top = sortBy(cities, [(c) => -c.viewCount]).slice(0, MODEL_DETAIL_CITIES)
    const extra = slug ? cities.find((c) => c.slug === slug && !top.includes(c)) : undefined

    return extra ? [...top, extra] : top
}

export const getModelDetail = async (
    modelId: ModelId,
    cities: City[],
    variable: Variable,
    window: SkillWindow,
    now = new Date(),
): Promise<ModelDetailResponse> => {
    const { from, to, days } = getWindowRange(window, now)
    const isOpenMeteo = MODELS.find((m) => m.id === modelId)?.source === 'open-meteo'
    const perCity = await Promise.all(
        cities.map(async (city) => {
            if (!isOpenMeteo) return { city, byLead: LEAD_BUCKETS.map(() => []) }

            const data = await fetchPreviousRuns({
                lat: city.lat,
                lon: city.lon,
                variable,
                from,
                to,
                maxLeadDay: LEAD_BUCKETS.length,
            })
            const byDay = data.models[modelId]
            const consensus = computeConsensusTruth(data)
            const byLead = LEAD_BUCKETS.map((_, i) =>
                byDay ? collectErrors(data.steps, byDay, i + 1, consensus, variable, now) : [],
            )

            return { city, byLead }
        }),
    )
    const worst = sortBy(
        perCity.flatMap(({ city, byLead }) =>
            byLead.flatMap((records, i) =>
                getWorst(records).map((w) => ({ ...w, slug: city.slug, leadBucket: LEAD_BUCKETS[i] })),
            ),
        ),
        [(w) => -Math.abs(w.error)],
    ).slice(0, 10)

    return {
        cities: perCity.map(({ city, byLead }) => ({
            slug: city.slug,
            name: city.name,
            biasDaily: days.map((day) => {
                const stats = summarizeErrors(byLead[0].filter((r) => r.day === day))
                return { day, bias: stats.bias, n: stats.n }
            }),
            errorByLead: LEAD_BUCKETS.map((leadBucket, i) => {
                const stats = summarizeErrors(byLead[i])
                return { leadBucket, mae: stats.mae, n: stats.n }
            }),
        })),
        worst,
    }
}

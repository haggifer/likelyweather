import { fetchPreviousRuns } from '@/server/sources/previousRuns'
import { City, EvolutionResponse } from '@/shared/api'
import { EVOLUTION_MAX_DAYS, FORECAST_HOURS } from '@/shared/constants'
import { ModelId } from '@/shared/models'
import { addHours, buildSteps, floorToStep } from '@/shared/time'
import { Variable } from '@/shared/variables'

const EVOLUTION_PAST_HOURS = 72

export const getEvolutionSteps = (now = new Date()) =>
    buildSteps(addHours(now, -EVOLUTION_PAST_HOURS), addHours(floorToStep(now), FORECAST_HOURS))

export const getEvolution = async (city: City, variable: Variable, validTime: string): Promise<EvolutionResponse> => {
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

    return { validTime, points }
}

import { cached } from '@/server/cache'
import { env } from '@/server/env'
import { indexHourlyTimes, toStepSeries } from '@/server/resample'
import { fetchJson } from '@/server/sources/fetchWithRetry'
import { LatLon, OpenMeteoLocation } from '@/server/sources/openMeteo'
import { ModelId, OPEN_METEO_MODELS } from '@/shared/models'
import { addHours, buildSteps, toUtcDate } from '@/shared/time'
import { Variable, VARIABLE_BY_ID } from '@/shared/variables'

// [leadDay][stepIndex]: leadDay 0 is the most recent run (0–6 h lead, the model's own analysis proxy),
// leadDay N is the run issued N days earlier (lead 24·N to 24·N+6 h).
export type LeadDaySeries = (number | null)[][]

export interface PreviousRunsData {
    steps: string[]
    models: Partial<Record<ModelId, LeadDaySeries>>
}

interface PreviousRunsRequest extends LatLon {
    variable: Variable
    from: Date
    to: Date
    maxLeadDay: number
}

const PREVIOUS_RUNS_TTL_SECONDS = 3 * 3600

const getSeriesKey = (baseKey: string, day: number) => (day === 0 ? baseKey : `${baseKey}_previous_day${day}`)

export const fetchPreviousRuns = ({ lat, lon, variable, from, to, maxLeadDay }: PreviousRunsRequest) => {
    const info = VARIABLE_BY_ID[variable]
    const startDate = toUtcDate(addHours(from, -24))
    const endDate = toUtcDate(to)
    const key = `prev:${lat.toFixed(3)},${lon.toFixed(3)}:${variable}:${startDate}:${endDate}:${maxLeadDay}`

    return cached(key, PREVIOUS_RUNS_TTL_SECONDS, async (): Promise<PreviousRunsData> => {
        const days = Array.from({ length: maxLeadDay + 1 }, (_, d) => d)
        const params = new URLSearchParams({
            latitude: lat.toFixed(4),
            longitude: lon.toFixed(4),
            hourly: days.map((d) => getSeriesKey(info.openMeteoKey, d)).join(','),
            models: OPEN_METEO_MODELS.join(','),
            start_date: startDate,
            end_date: endDate,
            timezone: 'UTC',
            wind_speed_unit: 'ms',
        })
        const body = await fetchJson<OpenMeteoLocation>(
            `${env.OPEN_METEO_PREVIOUS_RUNS_BASE}/v1/forecast?${params}`,
            {},
            {
                timeoutMs: 45_000,
            },
        )
        const timeIndex = indexHourlyTimes(body.hourly.time)
        const steps = buildSteps(from, to)
        const models: Partial<Record<ModelId, LeadDaySeries>> = {}

        for (const model of OPEN_METEO_MODELS) {
            const byDay = days.map((d) =>
                toStepSeries(
                    timeIndex,
                    body.hourly[`${getSeriesKey(info.openMeteoKey, d)}_${model}`],
                    steps,
                    info.aggregation,
                ),
            )

            if (byDay.some((values) => values.some((v) => v !== null))) models[model] = byDay
        }

        return { steps, models }
    })
}

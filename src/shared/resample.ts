import { STEP_HOURS } from '@/shared/constants'
import { addHours, toIsoMinute } from '@/shared/time'
import { Aggregation } from '@/shared/variables'

// Open-Meteo hourly times come as "YYYY-MM-DDTHH:MM" in UTC when timezone=UTC.
export const indexHourlyTimes = (times: string[]) => new Map(times.map((t, i) => [`${t}Z`, i]))

export const indexSteps = (steps: string[]) => new Map(steps.map((s, i) => [s, i]))

const round = (value: number) => Math.round(value * 100) / 100

// Instant variables are sampled at the step; sums (precipitation) are the `sumHours` hourly amounts ending at the
// step, so a 6-hour 06:00 value covers 00:00–06:00. A sum with any missing hour is null rather than an undercount.
export const toStepSeries = (
    timeIndex: Map<string, number>,
    values: (number | null)[] | undefined,
    steps: string[],
    aggregation: Aggregation,
    sumHours = STEP_HOURS,
) =>
    steps.map((step) => {
        if (!values) return null

        if (aggregation === 'instant') {
            const i = timeIndex.get(step)
            return i === undefined ? null : (values[i] ?? null)
        }

        let total = 0

        for (let h = sumHours - 1; h >= 0; h--) {
            const i = timeIndex.get(toIsoMinute(addHours(new Date(step), -h)))
            const v = i === undefined ? null : values[i]

            if (v === null || v === undefined) return null

            total += v
        }

        return round(total)
    })

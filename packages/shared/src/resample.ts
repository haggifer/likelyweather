import { addHours, toIsoMinute } from './time'
import { Aggregation } from './variables'

const round = (value: number) => Math.round(value * 100) / 100

const getStepSample = (timeIndex: Map<string, number>, values: (number | null)[], step: string) => {
    const i = timeIndex.get(step)

    return i === undefined ? null : (values[i] ?? null)
}

const getStepSum = (timeIndex: Map<string, number>, values: (number | null)[], step: string, sumHours: number) => {
    let total = 0

    for (let h = sumHours - 1; h >= 0; h--) {
        const i = timeIndex.get(toIsoMinute(addHours(new Date(step), -h)))
        const v = i === undefined ? null : values[i]

        if (v === null || v === undefined) return null

        total += v
    }

    return round(total)
}

// Open-Meteo hourly times come as "YYYY-MM-DDTHH:MM" in UTC when timezone=UTC.
export const indexHourlyTimes = (times: string[]) => new Map(times.map((t, i) => [`${t}Z`, i]))

export const indexSteps = (steps: string[]) => new Map(steps.map((s, i) => [s, i]))

// Instant variables are sampled at the step; sums (precipitation) are the `sumHours` hourly amounts ending at the
// step, so with `sumHours` 6 a 06:00 value covers 00:00–06:00. A sum with any missing hour is null rather than an
// undercount.
export const toStepSeries = (
    timeIndex: Map<string, number>,
    values: (number | null)[] | undefined,
    steps: string[],
    aggregation: Aggregation,
    sumHours: number,
) =>
    steps.map((step) => {
        if (!values) return null

        return aggregation === 'instant'
            ? getStepSample(timeIndex, values, step)
            : getStepSum(timeIndex, values, step, sumHours)
    })

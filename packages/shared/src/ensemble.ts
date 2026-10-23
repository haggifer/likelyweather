import { RAIN_THRESHOLD_MM } from './constants'
import { getLocalDateKey } from './time'
import { DisagreementThresholds, Variable, VARIABLE_BY_ID } from './variables'

export type DisagreementLabel = 'agree' | 'mixed' | 'split'

export interface EnsembleStats {
    median: (number | null)[]
    min: (number | null)[]
    max: (number | null)[]
    count: number[]
}

export interface DayDisagreement {
    day: string
    spread: number
    label: DisagreementLabel
}

const getStepValues = (series: (number | null)[][], index: number) =>
    series.map((values) => values[index]).filter((v): v is number => v !== null && v !== undefined)

// A precipitation step is a sum ending at the step, so it is attributed to the day of its last hour.
const getStepDay = (step: string, variable: Variable, timeZone: string) =>
    variable === Variable.Precip
        ? getLocalDateKey(new Date(new Date(step).getTime() - 1).toISOString(), timeZone)
        : getLocalDateKey(step, timeZone)

const groupFutureStepsByDay = (steps: string[], variable: Variable, timeZone: string, now: Date) => {
    const byDay = new Map<string, number[]>()

    steps.forEach((step, i) => {
        if (new Date(step).getTime() <= now.getTime()) return

        const day = getStepDay(step, variable, timeZone)

        byDay.set(day, [...(byDay.get(day) ?? []), i])
    })

    return byDay
}

const isComplete = (values: (number | null | undefined)[]): values is number[] =>
    values.every((v) => v !== null && v !== undefined)

// A model's day total counts only when it covers every step of the day: met.no's hourly data ends about 60 hours
// out, and a partial total would read as disagreement. Fewer than two totals have no spread.
const getDayTotalsRange = (series: (number | null)[][], indices: number[]) => {
    const totals = series
        .map((values) => indices.map((i) => values[i]))
        .filter(isComplete)
        .map((values) => values.reduce((sum, v) => sum + v, 0))

    return totals.length > 1 ? Math.max(...totals) - Math.min(...totals) : null
}

const getMeanStepRange = (series: (number | null)[][], indices: number[]) => {
    const ranges = indices
        .map((i) => getStepValues(series, i))
        .filter((values) => values.length > 1)
        .map((values) => Math.max(...values) - Math.min(...values))

    return ranges.length ? ranges.reduce((sum, r) => sum + r, 0) / ranges.length : null
}

const getDaySpread = (series: (number | null)[][], indices: number[], variable: Variable) =>
    variable === Variable.Precip ? getDayTotalsRange(series, indices) : getMeanStepRange(series, indices)

export const quantileSorted = (sorted: number[], p: number) => {
    if (!sorted.length) return null

    const position = (sorted.length - 1) * p
    const lower = Math.floor(position)
    const upper = Math.ceil(position)

    return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower)
}

export const median = (values: number[]) =>
    quantileSorted(
        [...values].sort((a, b) => a - b),
        0.5,
    )

export const getStandardDeviation = (values: number[]) => {
    if (values.length < 2) return null

    const mean = values.reduce((sum, v) => sum + v, 0) / values.length

    return Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length)
}

export const computeEnsemble = (series: (number | null)[][], stepCount: number): EnsembleStats => {
    const stats: EnsembleStats = { median: [], min: [], max: [], count: [] }

    for (let i = 0; i < stepCount; i++) {
        const sorted = getStepValues(series, i).sort((a, b) => a - b)

        stats.count.push(sorted.length)
        stats.median.push(quantileSorted(sorted, 0.5))
        stats.min.push(sorted.length ? sorted[0] : null)
        stats.max.push(sorted.length ? sorted[sorted.length - 1] : null)
    }

    return stats
}

export const getAngularDistance = (a: number, b: number) => {
    const diff = Math.abs(a - b) % 360

    return diff > 180 ? 360 - diff : diff
}

export const getCircularMedian = (degrees: number[]) => {
    if (!degrees.length) return null

    let best = degrees[0]
    let bestCost = Infinity

    for (const candidate of degrees) {
        const cost = degrees.reduce((sum, d) => sum + getAngularDistance(candidate, d), 0)

        if (cost < bestCost) {
            bestCost = cost
            best = candidate
        }
    }

    return best
}

export const computeMedianDirection = (series: (number | null)[][], stepCount: number) =>
    Array.from({ length: stepCount }, (_, i) => getCircularMedian(getStepValues(series, i)))

export const getDisagreementLabel = (spread: number, thresholds: DisagreementThresholds): DisagreementLabel => {
    if (spread < thresholds.agree) return 'agree'

    if (spread >= thresholds.split) return 'split'

    return 'mixed'
}

export const computeChanceOfRain = (series: (number | null)[][], stepCount: number) =>
    Array.from({ length: stepCount }, (_, i) => {
        const values = getStepValues(series, i)

        return values.length ? values.filter((v) => v > RAIN_THRESHOLD_MM).length / values.length : null
    })

export const computeDisagreement = (
    steps: string[],
    series: (number | null)[][],
    variable: Variable,
    timeZone: string,
    now: Date,
): DayDisagreement[] => {
    const thresholds = VARIABLE_BY_ID[variable].disagreement
    const byDay = groupFutureStepsByDay(steps, variable, timeZone, now)

    // A day where fewer than two models have data is left out: one model always "agrees" with itself.
    return [...byDay.entries()].flatMap(([day, indices]) => {
        const spread = getDaySpread(series, indices, variable)

        return spread === null ? [] : [{ day, spread, label: getDisagreementLabel(spread, thresholds) }]
    })
}

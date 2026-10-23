import { LatestResponse } from './api'
import {
    computeChanceOfRain,
    computeDisagreement,
    computeEnsemble,
    computeMedianDirection,
    DayDisagreement,
    EnsembleStats,
} from './ensemble'
import { formatDateKey, formatNumber, formatPeriodLabel, formatStepLabel } from './format'
import { ModelId } from './models'
import { SLOT_HOURS } from './slots'
import { addHours, toIsoMinute } from './time'
import { Variable, VARIABLE_BY_ID } from './variables'

export interface DashboardStats {
    stats: EnsembleStats
    disagreement: DayDisagreement[]
    directions: (number | null)[] | null
}

interface ValueRange {
    min: number | null
    max: number | null
}

// The values of the dashboard's summary sentence, apart from the variable's name, which each app translates.
export interface DashboardSummaryValues {
    count: number
    min: string
    max: string
    unit: string
    day: string
    spread: string
}

const NO_DAY = '–'

export const getSlotEnd = (step: string) => toIsoMinute(addHours(new Date(step), SLOT_HOURS))

// The run without the models the reader turned off, so the median, the range, the wind direction, the disagreement and
// the summary count only the models on the chart and in the table (author, 2026-10-20).
export const getShownLatest = (latest: LatestResponse, hidden: ModelId[]): LatestResponse =>
    hidden.length
        ? {
              ...latest,
              series: latest.series.filter((s) => !hidden.includes(s.modelId)),
              directions: latest.directions?.filter((d) => !hidden.includes(d.modelId)),
          }
        : latest

export const getEnsembleStats = (latest: Pick<LatestResponse, 'series' | 'steps'>) =>
    computeEnsemble(
        latest.series.map((s) => s.values),
        latest.steps.length,
    )

// The chance of rain stands where the median does, in percent, so the chart, the readout and the table read it like a
// median; it has no band, since the models' own values are amounts in millimetres.
const getChanceStats = (latest: Pick<LatestResponse, 'series' | 'steps'>): EnsembleStats => {
    const { count } = getEnsembleStats(latest)
    const chance = computeChanceOfRain(
        latest.series.map((s) => s.values),
        latest.steps.length,
    )
    const none = count.map(() => null)

    return { median: chance.map((v) => (v === null ? null : v * 100)), min: none, max: none, count }
}

// A computed view (the chance of rain) draws only its own value: its models' values are in another unit, so they are
// listed beside the chart but never drawn on its axis.
export const isComputedView = (variable: Variable) => VARIABLE_BY_ID[variable].source !== undefined

export const getSummaryKey = (variable: Variable) => (variable === Variable.Chance ? 'summaryChance' : 'summary')

export const getDashboardStats = (
    latest: LatestResponse,
    variable: Variable,
    timeZone: string,
    now: Date,
): DashboardStats => {
    const values = latest.series.map((s) => s.values)
    // A slot's precipitation covers the 3 hours after it; computeDisagreement files a sum under the day it ends.
    const disagreementSteps = variable === Variable.Precip ? latest.steps.map(getSlotEnd) : latest.steps

    return {
        stats: variable === Variable.Chance ? getChanceStats(latest) : getEnsembleStats(latest),
        disagreement: computeDisagreement(disagreementSteps, values, variable, timeZone, now),
        directions: latest.directions
            ? computeMedianDirection(
                  latest.directions.map((d) => d.values),
                  latest.steps.length,
              )
            : null,
    }
}

export const getFutureRange = (values: (number | null)[], steps: string[], now: Date): ValueRange => {
    const future = values.filter((_, i) => new Date(steps[i]) > now).filter((v): v is number => v !== null)

    return future.length ? { min: Math.min(...future), max: Math.max(...future) } : { min: null, max: null }
}

// A spread of a whole-number variable still needs its tenths: two models at 1012 and 1013 hPa differ by 1.0, not 1.
export const formatSpread = (spread: number | undefined, decimals: number) =>
    formatNumber(spread, decimals === 0 ? 1 : decimals)

export const getMostSplitDay = (days: DayDisagreement[]): DayDisagreement | undefined =>
    days.reduce<DayDisagreement | undefined>((top, day) => (!top || day.spread > top.spread ? day : top), undefined)

// A sum, or the chance of rain drawn from one, covers the 3 hours after its slot, so its readout names the period; an
// instant names its time.
export const getReadoutLabel = (step: string, variable: Variable, timeZone: string, locale: string) =>
    VARIABLE_BY_ID[variable].aggregation === 'sum'
        ? formatPeriodLabel(step, getSlotEnd(step), timeZone, locale)
        : formatStepLabel(step, timeZone, locale)

export const getDashboardSummaryValues = (
    latest: LatestResponse,
    derived: DashboardStats,
    variable: Variable,
    now: Date,
    locale: string,
): DashboardSummaryValues => {
    const { decimals, unit } = VARIABLE_BY_ID[variable]
    const range = getFutureRange(derived.stats.median, latest.steps, now)
    const mostSplit = getMostSplitDay(derived.disagreement)

    return {
        count: latest.series.length,
        min: formatNumber(range.min, decimals),
        max: formatNumber(range.max, decimals),
        unit,
        day: mostSplit ? formatDateKey(mostSplit.day, locale, { weekday: 'long' }) : NO_DAY,
        spread: formatSpread(mostSplit?.spread, decimals),
    }
}

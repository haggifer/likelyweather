import { LatestResponse, Series } from '@fa/shared/api'
import { HOUR_MS } from '@fa/shared/constants'
import {
    computeChanceOfRain,
    computeDisagreement,
    computeEnsemble,
    computeMedianDirection,
    DayDisagreement,
    EnsembleStats,
} from '@fa/shared/ensemble'
import { formatNumber } from '@fa/shared/format'
import { indexSteps, toStepSeries } from '@fa/shared/resample'
import { DASHBOARD_HOURS, SLOT_HOURS } from '@fa/shared/slots'
import { addHours, toIsoMinute } from '@fa/shared/time'
import { Variable } from '@fa/shared/variables'
import { getNearestIndex, getSpanIndex } from './spaghetti-geometry'

interface DashboardStats {
    stats: EnsembleStats
    disagreement: DayDisagreement[]
    directions: (number | null)[] | null
}

export interface PrecipTotals {
    steps: string[]
    series: Series[]
    median: (number | null)[]
    chance: (number | null)[]
}

interface ValueRange {
    min: number | null
    max: number | null
}

export const PRECIP_WINDOW_HOURS = 6

const SLOT_MS = SLOT_HOURS * HOUR_MS

export const getSlotEnd = (step: string) => toIsoMinute(addHours(new Date(step), SLOT_HOURS))

export const getEnsembleStats = (latest: Pick<LatestResponse, 'series' | 'steps'>) =>
    computeEnsemble(
        latest.series.map((s) => s.values),
        latest.steps.length,
    )

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
        stats: getEnsembleStats(latest),
        disagreement: computeDisagreement(disagreementSteps, values, variable, timeZone, now),
        directions: latest.directions
            ? computeMedianDirection(
                  latest.directions.map((d) => d.values),
                  latest.steps.length,
              )
            : null,
    }
}

// 6-hour totals from the chart start, each labelled by the hour it ends, so the labels stay on the 3-hour grid.
export const getPrecipTotals = (data: LatestResponse, anchor: Date): PrecipTotals => {
    const steps = Array.from({ length: DASHBOARD_HOURS / PRECIP_WINDOW_HOURS }, (_, k) =>
        toIsoMinute(addHours(anchor, (k + 1) * PRECIP_WINDOW_HOURS)),
    )
    const timeIndex = indexSteps(data.steps)
    const series = data.series.map((s) => ({
        modelId: s.modelId,
        values: toStepSeries(timeIndex, s.values, steps, 'sum', PRECIP_WINDOW_HOURS),
    }))
    const values = series.map((s) => s.values)

    return {
        steps,
        series,
        median: computeEnsemble(values, steps.length).median,
        chance: computeChanceOfRain(values, steps.length),
    }
}

// The slot a readout follows: the hovered one, else the one for `now`. An instant reads at the nearest slot; a sum
// covers the 3 hours after its slot, so it reads at the slot whose span contains `now`, like a bar under the pointer.
export const getReadoutIndex = (steps: string[], hoverIndex: number, now: Date | null, isSum = false) => {
    if (hoverIndex >= 0) return hoverIndex

    if (!now) return 0

    const times = steps.map((s) => new Date(s))

    return isSum ? getSpanIndex(times, now, SLOT_MS) : getNearestIndex(times, now)
}

export const getFutureRange = (values: (number | null)[], steps: string[], now: Date): ValueRange => {
    const future = values.filter((_, i) => new Date(steps[i]) > now).filter((v): v is number => v !== null)

    return future.length ? { min: Math.min(...future), max: Math.max(...future) } : { min: null, max: null }
}

export const countRainySteps = (chance: (number | null)[]) => chance.filter((c) => (c ?? 0) >= 0.5).length

export const sumValues = (values: (number | null)[]) => values.reduce<number>((sum, v) => sum + (v ?? 0), 0)

// A spread of a whole-number variable still needs its tenths: two models at 1012 and 1013 hPa differ by 1.0, not 1.
export const formatSpread = (spread: number | undefined, decimals: number) =>
    formatNumber(spread, decimals === 0 ? 1 : decimals)

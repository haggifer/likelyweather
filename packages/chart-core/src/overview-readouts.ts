import { formatNumber } from '@fa/shared/format'
import { PanelVariable, SECONDARY_VARIABLE } from '@fa/shared/overview-panels'
import { OverviewVariable, Variable, VARIABLE_BY_ID } from '@fa/shared/variables'
import { MedianSeries, OverviewMedians } from './overview-stats'
import { getNearestIndex } from './spaghetti-geometry'

// A readout's second line: `variable` names it, or is null for the chance of rain.
export interface ExtraReadout {
    variable: OverviewVariable | null
    value: string
    unit: string
}

const NO_SERIES: MedianSeries = { steps: [], values: [] }

// The caller fetches every series its panels draw; a missing one draws as an empty panel rather than failing.
export const getPanelSeries = (series: OverviewMedians, variable: OverviewVariable) => series[variable] ?? NO_SERIES

// Feels-like and gusts are drawn as a second, dashed line in the panel of the variable they belong to.
export const getSecondarySeries = (series: OverviewMedians, variable: PanelVariable) => {
    const secondary = SECONDARY_VARIABLE[variable]

    return (secondary && series[secondary]) || null
}

export const getValueAt = (s: MedianSeries, step: string) => {
    const index = s.steps.indexOf(step)

    return index >= 0 ? s.values[index] : null
}

// One crosshair for every panel: each reads the slot nearest the pointer (or now), so a precipitation readout is the 3
// hours from that slot, which can be the bar after the one under the line (author, 2026-10-09).
export const getOverviewReadoutIndex = (times: Date[], hoverIndex: number | null, now: Date | null) =>
    hoverIndex ?? (now ? getNearestIndex(times, now) : 0)

// The dashed line's value at the slot, or the chance of rain of the precipitation slot.
export const getExtraReadout = (
    variable: PanelVariable,
    series: OverviewMedians,
    chance: (number | null)[] | null,
    step: string,
    index: number,
): ExtraReadout | null => {
    const secondary = SECONDARY_VARIABLE[variable]

    if (secondary) {
        const { decimals, unit } = VARIABLE_BY_ID[secondary]

        return {
            variable: secondary,
            value: formatNumber(getValueAt(getPanelSeries(series, secondary), step), decimals),
            unit,
        }
    }

    if (variable !== Variable.Precip || !chance) return null

    const value = chance[index] ?? null

    return { variable: null, value: formatNumber(value === null ? null : value * 100, 0), unit: '%' }
}

export const hasExtraReadout = (variable: PanelVariable, hasChance: boolean) =>
    Boolean(SECONDARY_VARIABLE[variable]) || (hasChance && variable === Variable.Precip)

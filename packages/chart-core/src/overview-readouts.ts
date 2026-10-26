import { HOUR_MS } from '@fa/shared/constants'
import { formatNumber } from '@fa/shared/format'
import { PanelVariable, SECONDARY_VARIABLE } from '@fa/shared/overview-panels'
import { SLOT_HOURS } from '@fa/shared/slots'
import { OverviewVariable, Variable, VARIABLE_BY_ID } from '@fa/shared/variables'
import { MedianSeries, OverviewMedians } from './overview-stats'
import { getNearestIndex, getSpanIndex } from './spaghetti-geometry'

// A readout's second line: `variable` names it, or is null for the chance of rain.
export interface ExtraReadout {
    variable: OverviewVariable | null
    value: string
    unit: string
}

const NO_SERIES: MedianSeries = { steps: [], values: [] }
const SLOT_MS = SLOT_HOURS * HOUR_MS

// The caller fetches every series its panels draw; a missing one draws as an empty panel rather than failing.
export const getPanelSeries = (series: OverviewMedians, variable: OverviewVariable) => series[variable] ?? NO_SERIES

export const getSecondarySeries = (series: OverviewMedians, variable: PanelVariable) => {
    const secondary = SECONDARY_VARIABLE[variable]

    return (secondary && series[secondary]) || null
}

export const getValueAt = (s: MedianSeries, step: string) => {
    const index = s.steps.indexOf(step)

    return index >= 0 ? s.values[index] : null
}

// One crosshair for every panel: each reads the slot nearest the pointer (or now), so a precipitation readout is the 3
// hours from that slot, which can be the bar after the one under the line.
export const getOverviewReadoutIndex = (times: Date[], hoverIndex: number | null, now: Date | null) =>
    hoverIndex ?? (now ? getNearestIndex(times, now) : 0)

// Before a pick, the precipitation readout is the bar the now line is in, labelled "these 3 h", rather than the slot
// nearest now, which can be the next bar.
export const getPanelReadoutIndex = (
    variable: PanelVariable,
    times: Date[],
    hoverIndex: number | null,
    now: Date | null,
) =>
    variable === Variable.Precip && hoverIndex === null && now
        ? getSpanIndex(times, now, SLOT_MS)
        : getOverviewReadoutIndex(times, hoverIndex, now)

// A precipitation readout sums the slot the now line is in, the 3 hours from a picked slot, or an archive hour.
export const getPrecipUnitKey = (isArchive: boolean, isNow: boolean) =>
    isArchive ? 'perHourPast' : isNow ? 'perSlotNow' : 'perSlot'

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

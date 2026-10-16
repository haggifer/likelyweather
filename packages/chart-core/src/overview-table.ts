import { formatNumber } from '@fa/shared/format'
import { PanelVariable, SECONDARY_VARIABLE } from '@fa/shared/overview-panels'
import { OverviewVariable, Variable, VARIABLE_BY_ID } from '@fa/shared/variables'
import { getPanelSeries, getValueAt } from './overview-readouts'
import { OverviewMedians } from './overview-stats'

// One column of the overview's table: a variable's median, or, with `variable` null, the chance of rain.
export interface OverviewTableColumn {
    key: string
    variable: OverviewVariable | null
}

const CHANCE_COLUMN: OverviewTableColumn = { key: 'chance', variable: null }

// What each panel draws, in the panels' order: its median, then its readout's second line as a column of its own
// (feels-like after temperature, gusts after wind speed, the chance of rain after precipitation).
export const getOverviewTableColumns = (panels: PanelVariable[], hasChance: boolean) =>
    panels.flatMap((variable): OverviewTableColumn[] => {
        const secondary = SECONDARY_VARIABLE[variable]
        const column = { key: variable, variable }

        if (secondary) return [column, { key: secondary, variable: secondary }]

        return variable === Variable.Precip && hasChance ? [column, CHANCE_COLUMN] : [column]
    })

// A cell at the slot `step`, the `index`-th of the overview's axis.
export const formatOverviewTableCell = (
    { variable }: OverviewTableColumn,
    series: OverviewMedians,
    chance: (number | null)[] | null,
    step: string,
    index: number,
) => {
    if (variable)
        return formatNumber(getValueAt(getPanelSeries(series, variable), step), VARIABLE_BY_ID[variable].decimals)

    const value = chance?.[index] ?? null

    return formatNumber(value === null ? null : value * 100, 0)
}

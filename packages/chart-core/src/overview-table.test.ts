import { Variable } from '@fa/shared/variables'
import { OverviewMedians } from './overview-stats'
import { formatOverviewTableCell, getOverviewTableColumns } from './overview-table'

const SLOTS = ['2026-10-12T00:00:00.000Z', '2026-10-12T03:00:00.000Z']
const SERIES: OverviewMedians = {
    [Variable.Temp]: { steps: SLOTS, values: [16, 17.25] },
    [Variable.Feels]: { steps: SLOTS, values: [14.5, null] },
    [Variable.Precip]: { steps: SLOTS, values: [0.4, 0] },
}

describe('overview table', () => {
    it('follows each panel with its second line, in the panels order', () => {
        const columns = getOverviewTableColumns(
            [Variable.Precip, Variable.Pressure, Variable.Temp, Variable.Wind],
            true,
        )

        expect(columns.map((c) => c.key)).toEqual([
            Variable.Precip,
            'chance',
            Variable.Pressure,
            Variable.Temp,
            Variable.Feels,
            Variable.Wind,
            Variable.Gusts,
        ])
    })

    it('has no chance-of-rain column without a chance of rain, as in the archive', () => {
        expect(getOverviewTableColumns([Variable.Precip], false).map((c) => c.key)).toEqual([Variable.Precip])
    })

    it('formats a median with its variable decimals, and a missing one as a dash', () => {
        const [temp, feels] = getOverviewTableColumns([Variable.Temp], false)

        expect(formatOverviewTableCell(temp, SERIES, null, SLOTS[1], 1)).toBe('17.3')
        expect(formatOverviewTableCell(feels, SERIES, null, SLOTS[1], 1)).toBe('–')
    })

    it('reads the chance of rain by the slot index, in percent', () => {
        const [, chance] = getOverviewTableColumns([Variable.Precip], true)

        expect(formatOverviewTableCell(chance, SERIES, [0.4, null], SLOTS[0], 0)).toBe('40')
        expect(formatOverviewTableCell(chance, SERIES, [0.4, null], SLOTS[1], 1)).toBe('–')
    })
})

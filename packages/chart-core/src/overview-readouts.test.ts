import { Variable } from '@fa/shared/variables'
import {
    getExtraReadout,
    getOverviewReadoutIndex,
    getPanelSeries,
    getSecondarySeries,
    getValueAt,
    hasExtraReadout,
} from './overview-readouts'
import { OverviewMedians } from './overview-stats'

const SLOTS = ['2026-10-12T00:00:00.000Z', '2026-10-12T03:00:00.000Z', '2026-10-12T06:00:00.000Z']
const TIMES = SLOTS.map((s) => new Date(s))
const SERIES: OverviewMedians = {
    [Variable.Temp]: { steps: SLOTS, values: [16, 17, 18] },
    [Variable.Feels]: { steps: SLOTS, values: [14.5, 15, 16] },
    [Variable.Wind]: { steps: SLOTS, values: [5, 6, 7] },
    [Variable.Gusts]: { steps: SLOTS, values: [null, null, null] },
    [Variable.Precip]: { steps: SLOTS, values: [0.4, 0, 0] },
}

describe('overview series', () => {
    it('draws a panel whose series was not fetched as empty', () => {
        expect(getPanelSeries(SERIES, Variable.Cloud)).toEqual({ steps: [], values: [] })
    })

    it('pairs temperature with feels-like and wind with gusts, and nothing else', () => {
        expect(getSecondarySeries(SERIES, Variable.Temp)).toBe(SERIES[Variable.Feels])
        expect(getSecondarySeries(SERIES, Variable.Precip)).toBeNull()
        expect(getSecondarySeries({}, Variable.Wind)).toBeNull()
    })

    it('reads a value by its step, and none for a step the series lacks', () => {
        expect(getValueAt(SERIES[Variable.Temp]!, SLOTS[1])).toBe(17)
        expect(getValueAt(SERIES[Variable.Temp]!, '2026-10-13T00:00:00.000Z')).toBeNull()
    })
})

describe('getOverviewReadoutIndex', () => {
    it('follows the crosshair, else the slot nearest now, else the first slot', () => {
        expect(getOverviewReadoutIndex(TIMES, 2, new Date(SLOTS[0]))).toBe(2)
        expect(getOverviewReadoutIndex(TIMES, null, new Date('2026-10-12T02:00:00.000Z'))).toBe(1)
        expect(getOverviewReadoutIndex(TIMES, null, null)).toBe(0)
    })
})

describe('getExtraReadout', () => {
    it('gives the dashed line its value at the slot', () => {
        expect(getExtraReadout(Variable.Temp, SERIES, null, SLOTS[0], 0)).toEqual({
            variable: Variable.Feels,
            value: '14.5',
            unit: '°C',
        })
    })

    it('shows an unknown gust when no model has gusts', () => {
        expect(getExtraReadout(Variable.Wind, SERIES, null, SLOTS[0], 0)?.value).toBe('–')
    })

    it('gives precipitation its chance of rain in percent, and nothing in the archive', () => {
        expect(getExtraReadout(Variable.Precip, SERIES, [0.4, 0, null], SLOTS[0], 0)).toEqual({
            variable: null,
            value: '40',
            unit: '%',
        })
        expect(getExtraReadout(Variable.Precip, SERIES, [0.4, 0, null], SLOTS[2], 2)?.value).toBe('–')
        expect(getExtraReadout(Variable.Precip, SERIES, null, SLOTS[0], 0)).toBeNull()
    })

    it('gives a panel without a second line none', () => {
        expect(getExtraReadout(Variable.Pressure, SERIES, [0.4, 0, null], SLOTS[0], 0)).toBeNull()
        expect(hasExtraReadout(Variable.Pressure, true)).toBe(false)
        expect(hasExtraReadout(Variable.Temp, false)).toBe(true)
        expect(hasExtraReadout(Variable.Precip, false)).toBe(false)
    })
})

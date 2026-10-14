import { describe, expect, it } from 'vitest'
import { ModelId } from './models'
import { formatPairedMedian, formatPairedModel, toPairedRuns } from './paired-values'
import { Variable } from './variables'

const TEMP = { series: [{ modelId: ModelId.Gfs, values: [17.24, null] }], median: [17.2, 18] }
const FEELS = { series: [{ modelId: ModelId.Gfs, values: [15, 16.04] }], median: [15, null] }

describe('toPairedRuns', () => {
    it('puts the actual value first whichever sub-tab is open', () => {
        expect(toPairedRuns(Variable.Temp, TEMP, FEELS)).toEqual({ primary: TEMP, secondary: FEELS })
        expect(toPairedRuns(Variable.Feels, FEELS, TEMP)).toEqual({ primary: TEMP, secondary: FEELS })
    })
})

describe('formatPairedModel and formatPairedMedian', () => {
    const runs = toPairedRuns(Variable.Temp, TEMP, FEELS)

    it('formats the actual value with the companion in brackets', () => {
        expect(formatPairedModel(runs, ModelId.Gfs, 0, 1)).toBe('17.2 (15.0)')
        expect(formatPairedMedian(runs, 0, 1)).toBe('17.2 (15.0)')
    })

    it('shows a dash for a missing value or model', () => {
        expect(formatPairedModel(runs, ModelId.Gfs, 1, 1)).toBe('– (16.0)')
        expect(formatPairedModel(runs, ModelId.Gem, 0, 1)).toBe('– (–)')
        expect(formatPairedMedian(runs, 1, 1)).toBe('18.0 (–)')
    })
})

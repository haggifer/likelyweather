import { hasSeriesValues, hasValues } from './has-values'

describe('hasValues', () => {
    it('finds a single value among the gaps', () => {
        expect(hasValues([null, 0, null])).toBe(true)
    })

    it('is false for gaps only or nothing', () => {
        expect(hasValues([null, null])).toBe(false)
        expect(hasValues([])).toBe(false)
    })
})

describe('hasSeriesValues', () => {
    it('is true when any series has a value', () => {
        expect(hasSeriesValues([{ values: [null] }, { values: [null, 1012] }])).toBe(true)
    })

    it('is false for no series, as when every model is hidden, or for series of gaps', () => {
        expect(hasSeriesValues([])).toBe(false)
        expect(hasSeriesValues([{ values: [null, null] }])).toBe(false)
    })
})

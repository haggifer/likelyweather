import { isInsidePlot } from './plot-area'

const PLOT = { left: 44, top: 24, right: 308, bottom: 250 }

describe('plot area', () => {
    it('takes points inside the plot, its edges included, and nothing on the axes', () => {
        expect(isInsidePlot(44, 24, PLOT)).toBe(true)
        expect(isInsidePlot(200, 100, PLOT)).toBe(true)
        expect(isInsidePlot(20, 100, PLOT)).toBe(false)
        expect(isInsidePlot(200, 265, PLOT)).toBe(false)
    })
})

import { getYDomain, getYTicks } from '@/charts/scales'
import { Variable } from '@fa/shared/variables'

const precipTicks = (values: (number | null)[]) => getYTicks(getYDomain(values, Variable.Precip), Variable.Precip, 3)

describe('precipitation axis', () => {
    it('shows only 0 and 0.5 mm when no model forecasts precipitation', () => {
        expect(precipTicks([0, 0, null])).toEqual([0, 0.5])
        expect(precipTicks([null])).toEqual([0, 0.5])
    })

    it('never goes below a 0.5 mm step for trace amounts', () => {
        expect(precipTicks([0, 0.1, 0.3])).toEqual([0, 0.5])
    })

    it('keeps 0.5 mm steps while three of them cover the maximum', () => {
        expect(precipTicks([0.1, 1.3])).toEqual([0, 0.5, 1, 1.5])
    })

    it('widens the step to keep at most four ticks', () => {
        expect(precipTicks([2.4])).toEqual([0, 1, 2, 3])
        expect(precipTicks([11])).toEqual([0, 5, 10, 15])
    })

    it('uses 25 mm steps for an outlier between 60 and 75 mm instead of an axis to 100', () => {
        expect(precipTicks([0, 3.6, 61.7])).toEqual([0, 25, 50, 75])
        expect(precipTicks([48.8])).toEqual([0, 20, 40, 60])
        expect(precipTicks([80])).toEqual([0, 50, 100])
    })
})

describe('temperature axis', () => {
    it('snaps to 5 °C gridlines', () => {
        expect(getYTicks(getYDomain([12.3, 19.8], Variable.Temp), Variable.Temp, 3)).toEqual([10, 15, 20])
    })
})

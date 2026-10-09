import { getTopRoundedBarPath } from './bar-path'

describe('getTopRoundedBarPath', () => {
    it('rounds only the top corners', () => {
        expect(getTopRoundedBarPath(10, 20, 20, 50, 4)).toBe('M10,70 V24 Q10,20 14,20 H26 Q30,20 30,24 V70 Z')
    })

    it('keeps the radius within a short bar', () => {
        expect(getTopRoundedBarPath(0, 98, 20, 2, 4)).toBe('M0,100 V100 Q0,98 2,98 H18 Q20,98 20,100 V100 Z')
    })
})

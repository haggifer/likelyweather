import { getNowLabelStart } from './plot-geometry'

describe('getNowLabelStart', () => {
    it('centres the label on its line when the plot has room on the left', () => {
        expect(getNowLabelStart(200, 40, 100)).toBe(180)
    })

    it('holds the label against the visible left edge while the line is close to it', () => {
        expect(getNowLabelStart(110, 40, 100)).toBe(100)
    })

    it('starts the label at the line once the line has scrolled under the axis', () => {
        expect(getNowLabelStart(90, 40, 100)).toBe(90)
    })
})

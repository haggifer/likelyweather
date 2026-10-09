import { mixColors, withAlpha } from './color-mix'

describe('mixColors', () => {
    it('mixes two colours by the share of the first, like CSS color-mix in sRGB', () => {
        expect(mixColors('#ffffff', '#000000', 0.75)).toBe('#bfbfbf')
        expect(mixColors('#15803d', '#0b1b33', 1)).toBe('#15803d')
    })

    it('reads three-digit colours', () => {
        expect(mixColors('#fff', '#000', 0)).toBe('#000000')
    })
})

describe('withAlpha', () => {
    it('adds the share as the alpha channel', () => {
        expect(withAlpha('#15803d', 0.14)).toBe('#15803d24')
    })
})

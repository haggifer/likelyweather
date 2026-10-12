import { describe, expect, it } from 'vitest'
import { getInitialScrollLeft, getRevealScrollLeft, getScrollWidth, getVisibleRange } from './scroll-geometry'

describe('getScrollWidth', () => {
    it('keeps the container width when the slots fit', () => {
        expect(getScrollWidth(2000, 80, 22, 44)).toBe(2000)
    })

    it('widens to the slots minimum when they do not', () => {
        expect(getScrollWidth(390, 80, 22, 44)).toBe(44 + 80 * 22)
    })
})

describe('getInitialScrollLeft', () => {
    const input = { slotWidth: 22, insetLeft: 36, contentWidth: 1804, viewportWidth: 390 }

    it('puts now one slot inside the visible plot', () => {
        expect(getInitialScrollLeft(36 + 22 * 10, input)).toBe(22 * 9)
    })

    it('starts at 0 when now is before the chart or unknown', () => {
        expect(getInitialScrollLeft(10, input)).toBe(0)
        expect(getInitialScrollLeft(null, input)).toBe(0)
    })

    it('stops at the end when now is past the chart', () => {
        expect(getInitialScrollLeft(5000, input)).toBe(1804 - 390)
    })

    it('stays at 0 when the chart fits its container', () => {
        expect(getInitialScrollLeft(300, { ...input, contentWidth: 390 })).toBe(0)
    })
})

describe('getRevealScrollLeft', () => {
    const input = { scrollLeft: 200, viewportWidth: 390, insetLeft: 36, insetRight: 8 }

    it('leaves a visible point alone', () => {
        expect(getRevealScrollLeft(400, input)).toBe(200)
    })

    it('scrolls back to a point left of the plot', () => {
        expect(getRevealScrollLeft(220, input)).toBe(220 - 36)
    })

    it('scrolls on to a point right of the plot', () => {
        expect(getRevealScrollLeft(600, input)).toBe(600 - 390 + 8)
    })
})

describe('getVisibleRange', () => {
    it('is the plot between the insets when the chart is not scrolled', () => {
        expect(getVisibleRange(0, 390, [36, 8])).toEqual([36, 382])
    })

    it('follows the scroll, so labels clamp to what is on screen', () => {
        expect(getVisibleRange(500, 390, [36, 8])).toEqual([536, 882])
    })
})

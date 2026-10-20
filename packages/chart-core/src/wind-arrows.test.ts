import { scaleUtc } from 'd3-scale'
import { getWindMarks, getWindTransform } from './wind-arrows'

const TIMES = [new Date('2026-10-12T00:00Z'), new Date('2026-10-12T03:00Z')]
const x = scaleUtc().domain(TIMES).range([40, 100])

describe('wind arrows', () => {
    it('places a mark on every slot after the left edge, keeping a missing direction for a dot', () => {
        expect(getWindMarks(x, TIMES, [90, null])).toEqual([{ key: '2026-10-12T03:00:00.000Z', x: 100, deg: null }])
    })

    it('turns an arrow to where the wind blows, away from where it comes from', () => {
        expect(getWindTransform(40, 12, 90)).toBe('translate(40,12) rotate(270)')
    })
})

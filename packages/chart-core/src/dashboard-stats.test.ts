import { getReadoutIndex } from './dashboard-stats'

const STEPS = ['2030-01-01T00:00Z', '2030-01-01T03:00Z', '2030-01-01T06:00Z']

describe('getReadoutIndex', () => {
    it('prefers the hovered slot', () => {
        expect(getReadoutIndex(STEPS, 2, new Date('2030-01-01T00:10Z'))).toBe(2)
    })

    it('reads an instant at the slot nearest to now', () => {
        expect(getReadoutIndex(STEPS, -1, new Date('2030-01-01T05:00Z'))).toBe(2)
    })

    it('reads a sum at the slot whose 3 hours contain now', () => {
        expect(getReadoutIndex(STEPS, -1, new Date('2030-01-01T05:00Z'), true)).toBe(1)
    })

    it('starts at the first slot without a clock', () => {
        expect(getReadoutIndex(STEPS, -1, null)).toBe(0)
    })
})

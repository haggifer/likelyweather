import { getDayLabel } from './day-labels'

const label = (width: number) => getDayLabel('2026-09-26T12:00Z', width, 'UTC', 'en', 11)

describe('day labels in a chart', () => {
    it('uses the longest form that fits the day', () => {
        expect(label(200)).toBe('Sat 26 Sept')
        expect(label(60)).toBe('Sat 26')
        expect(label(30)).toBe('Sat')
    })

    it('drops a label only when even the weekday does not fit', () => {
        expect(label(20)).toBeNull()
    })
})

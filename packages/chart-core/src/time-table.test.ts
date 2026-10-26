import { DAY_LABEL_PADDING, getTimeTableDays, getTimeTableSlotLabels, placeDayLabel } from './time-table'

// Kyiv is UTC+2 in late October, so 22:00Z is local midnight.
const STEPS = ['2026-10-26T16:00:00Z', '2026-10-26T19:00:00Z', '2026-10-26T22:00:00Z', '2026-10-27T01:00:00Z']

describe('getTimeTableDays', () => {
    it('groups the slots by local day, with the full and the numeric date', () => {
        expect(getTimeTableDays(STEPS, 'Europe/Kyiv', 'ru')).toEqual([
            { key: '2026-10-26', start: 0, count: 2, label: 'пн, 26 окт.', shortLabel: '26.10' },
            { key: '2026-10-27', start: 2, count: 2, label: 'вт, 27 окт.', shortLabel: '27.10' },
        ])
    })
})

describe('getTimeTableSlotLabels', () => {
    it('reads each slot on the 24-hour clock, whatever the language', () => {
        expect(getTimeTableSlotLabels(STEPS, 'Europe/Kyiv', 'en')).toEqual(['18:00', '21:00', '00:00', '03:00'])
    })
})

describe('placeDayLabel', () => {
    const span: [number, number] = [100, 400]

    it('centres the label on the part of its cell that is on screen', () => {
        expect(placeDayLabel(span, [0, 300], 60, 30)).toEqual({ form: 'full', center: 200 })
        expect(placeDayLabel(span, [250, 600], 60, 30)).toEqual({ form: 'full', center: 325 })
    })

    it('falls back to the digits, then to nothing, as the visible part narrows', () => {
        const edge = 400 - 2 * DAY_LABEL_PADDING

        expect(placeDayLabel(span, [edge - 59, 600], 60, 30).form).toBe('short')
        expect(placeDayLabel(span, [edge - 29, 600], 60, 30).form).toBe('none')
    })
})

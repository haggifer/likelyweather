import { getStickyLabelOffset, getTimeTableDays, getTimeTableSlotLabels } from './time-table'

// Kyiv is UTC+2 in late October, so 22:00Z is local midnight.
const STEPS = ['2026-10-26T16:00:00Z', '2026-10-26T19:00:00Z', '2026-10-26T22:00:00Z', '2026-10-27T01:00:00Z']

describe('getTimeTableDays', () => {
    it('groups the slots by local day, each with its date', () => {
        expect(getTimeTableDays(STEPS, 'Europe/Kyiv', 'ru')).toEqual([
            { key: '2026-10-26', start: 0, count: 2, label: 'пн, 26 окт.' },
            { key: '2026-10-27', start: 2, count: 2, label: 'вт, 27 окт.' },
        ])
    })
})

describe('getTimeTableSlotLabels', () => {
    it('reads each slot on the 24-hour clock, whatever the language', () => {
        expect(getTimeTableSlotLabels(STEPS, 'Europe/Kyiv', 'en')).toEqual(['18:00', '21:00', '00:00', '03:00'])
    })
})

describe('getStickyLabelOffset', () => {
    const span: [number, number] = [100, 400]

    it('keeps the date at the start of its cell while the cell starts on screen', () => {
        expect(getStickyLabelOffset(span, 80, 0)).toBe(0)
    })

    it('rides the visible left edge while the cell scrolls past', () => {
        expect(getStickyLabelOffset(span, 80, 250)).toBe(150)
    })

    it('stops at the cell end, which then pushes the date out', () => {
        expect(getStickyLabelOffset(span, 80, 380)).toBe(220)
    })
})

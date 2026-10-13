import { getLocalMidnights } from '@fa/shared/format'
import { scaleUtc } from 'd3-scale'
import { getDayLabel, getDayLabels } from './day-labels'

const label = (width: number) => getDayLabel('2026-09-26T12:00Z', width, 'UTC', 'en', 11)

const START = new Date('2026-09-26T12:00Z')
const END = new Date('2026-09-28T00:00Z')

const getLabels = (width: number) => {
    const x = scaleUtc().domain([START, END]).range([0, width])

    return getDayLabels(getLocalMidnights(START, END, 'UTC'), {
        x,
        start: START,
        end: END,
        timeZone: 'UTC',
        locale: 'en',
        fontSize: 11,
    })
}

describe('day labels in a chart', () => {
    it('uses the longest form that fits the day', () => {
        expect(label(200)).toBe('Sat 26 Sept')
        expect(label(60)).toBe('Sat 26')
        expect(label(30)).toBe('Sat')
    })

    it('drops a label only when even the weekday does not fit', () => {
        expect(label(20)).toBeNull()
    })

    it('centres each day between its midnights, the chart ends standing for the missing ones', () => {
        expect(getLabels(720)).toEqual([
            { key: '2026-09-26T12:00:00.000Z', x: 120, text: 'Sat 26 Sept' },
            { key: '2026-09-27T00:00:00.000Z', x: 480, text: 'Sun 27 Sept' },
        ])
    })

    it('shortens a narrow day and leaves out one with no room for its weekday', () => {
        expect(getLabels(72).map((d) => d.text)).toEqual(['Sun 27'])
    })
})

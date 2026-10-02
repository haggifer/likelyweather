import { describe, expect, it } from 'vitest'
import { buildTimelineGrid } from './timeline-grid'

const FROM = '2026-10-01T00:00Z'
const TO = '2026-10-03T00:00Z'
const NOW = new Date('2026-10-02T10:00Z')

describe('buildTimelineGrid', () => {
    it('keeps the UTC layout for a UTC viewer', () => {
        const grid = buildTimelineGrid(FROM, TO, NOW, 'UTC', 'en')

        expect(grid.days).toEqual(['2026-10-01', '2026-10-02'])
        expect(grid.rows).toEqual([
            { cycleHour: 0, label: '00:00' },
            { cycleHour: 6, label: '06:00' },
            { cycleHour: 12, label: '12:00' },
            { cycleHour: 18, label: '18:00' },
        ])
        expect(grid.cells.get('2026-10-02|18')).toBe('2026-10-02T18:00Z')
    })

    it('labels the rows with the viewer clock', () => {
        const grid = buildTimelineGrid(FROM, TO, NOW, 'Europe/Kyiv', 'en')

        expect(grid.rows.map((r) => r.label)).toEqual(['03:00', '09:00', '15:00', '21:00'])
        expect(grid.cells.get('2026-10-01|0')).toBe('2026-10-01T00:00Z')
    })

    it('moves a run that starts after local midnight to the next day and reorders the rows', () => {
        const grid = buildTimelineGrid(FROM, TO, NOW, 'Asia/Tokyo', 'en')

        expect(grid.rows).toEqual([
            { cycleHour: 18, label: '03:00' },
            { cycleHour: 0, label: '09:00' },
            { cycleHour: 6, label: '15:00' },
            { cycleHour: 12, label: '21:00' },
        ])
        expect(grid.days).toEqual(['2026-10-01', '2026-10-02', '2026-10-03'])
        expect(grid.cells.get('2026-10-03|18')).toBe('2026-10-02T18:00Z')
        expect(grid.cells.has('2026-10-01|18')).toBe(false)
    })
})

import { buildSlots, getChartStart, getSlotStart, toSlotSeries } from './slots'

const at = (iso: string) => new Date(iso)

describe('getChartStart', () => {
    it('starts a chart at the local 3-hour slot its run was fetched in', () => {
        expect(getChartStart({ fetchedAt: '2026-10-02T12:47:00.000Z' }, 'America/New_York').toISOString()).toBe(
            '2026-10-02T10:00:00.000Z',
        )
    })
})

describe('getSlotStart', () => {
    it('floors to the local 3-hour slot east of Greenwich', () => {
        expect(getSlotStart(at('2026-09-24T10:30:00Z'), 'Europe/Kyiv').toISOString()).toBe('2026-09-24T09:00:00.000Z')
    })

    it('floors to the local 3-hour slot in summer time', () => {
        expect(getSlotStart(at('2026-09-24T13:10:00Z'), 'Europe/London').toISOString()).toBe('2026-09-24T11:00:00.000Z')
    })

    it('floors across the local date line west of Greenwich', () => {
        expect(getSlotStart(at('2026-09-24T03:00:00Z'), 'America/New_York').toISOString()).toBe(
            '2026-09-24T01:00:00.000Z',
        )
    })

    it('keeps whole UTC hours for half-hour offsets', () => {
        expect(getSlotStart(at('2026-09-24T14:40:00Z'), 'Asia/Kolkata').toISOString()).toBe('2026-09-24T13:00:00.000Z')
    })

    it('returns the same slot for any time inside it', () => {
        const start = getSlotStart(at('2026-09-24T09:00:00Z'), 'Europe/Kyiv')

        expect(getSlotStart(at('2026-09-24T11:59:00Z'), 'Europe/Kyiv')).toEqual(start)
    })
})

describe('buildSlots', () => {
    it('lists 3-hour slots over ten days including both ends', () => {
        const slots = buildSlots(at('2026-09-24T09:00:00Z'))

        expect(slots).toHaveLength(81)
        expect(slots[1]).toBe('2026-09-24T12:00Z')
        expect(slots.at(-1)).toBe('2026-10-04T09:00Z')
    })

    it('lists a shorter window when asked', () => {
        expect(buildSlots(at('2026-09-24T09:00:00Z'), 72)).toHaveLength(25)
    })
})

describe('toSlotSeries', () => {
    const hourly = Array.from({ length: 7 }, (_, h) => `2026-09-24T0${h}:00Z`)

    it('samples instants at each slot', () => {
        const values = hourly.map((_, h) => h / 10)

        expect(toSlotSeries(hourly, values, ['2026-09-24T03:00Z', '2026-09-24T06:00Z'], 'instant')).toEqual([0.3, 0.6])
    })

    it('sums the three hours that follow each slot, so the first slot is the coming three hours', () => {
        const values = hourly.map((_, h) => h / 10)

        expect(toSlotSeries(hourly, values, ['2026-09-24T00:00Z', '2026-09-24T03:00Z'], 'sum')).toEqual([0.6, 1.5])
        expect(toSlotSeries(hourly, values, ['2026-09-24T06:00Z'], 'sum')).toEqual([null])
    })
})

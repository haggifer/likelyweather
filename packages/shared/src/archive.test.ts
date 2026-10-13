import { describe, expect, it } from 'vitest'
import type { ArchiveResponse } from './api'
import {
    countArchiveDays,
    formatArchiveDate,
    formatArchiveRange,
    getArchiveHours,
    getArchiveRangeKey,
    getDefaultArchiveRange,
    getLatestArchiveDate,
    isEmptyArchive,
    isValidArchiveRange,
    resolveArchiveRange,
} from './archive'

const NOW = new Date('2026-10-12T18:00:00Z')

describe('archive ranges', () => {
    it('ends at yesterday in the city, since today is still partly a forecast', () => {
        expect(getLatestArchiveDate(NOW, 'Europe/London')).toBe('2026-10-11')
        expect(getLatestArchiveDate(new Date('2026-10-12T23:30:00Z'), 'Asia/Tokyo')).toBe('2026-10-12')
    })

    it('defaults to the week up to yesterday', () => {
        expect(getDefaultArchiveRange(NOW, 'Europe/London')).toEqual({ from: '2026-10-05', to: '2026-10-11' })
    })

    it('accepts at most twelve whole days between 1940 and yesterday', () => {
        expect(countArchiveDays({ from: '2026-09-30', to: '2026-10-11' })).toBe(12)
        expect(isValidArchiveRange({ from: '2026-09-30', to: '2026-10-11' }, '2026-10-11')).toBe(true)
        expect(isValidArchiveRange({ from: '2026-09-29', to: '2026-10-11' }, '2026-10-11')).toBe(false)
        expect(isValidArchiveRange({ from: '2026-10-11', to: '2026-10-12' }, '2026-10-11')).toBe(false)
        expect(isValidArchiveRange({ from: '2026-10-11', to: '2026-10-10' }, '2026-10-11')).toBe(false)
        expect(isValidArchiveRange({ from: '1939-12-31', to: '1940-01-01' }, '2026-10-11')).toBe(false)
        expect(isValidArchiveRange({ from: '2026-1-1', to: '2026-01-02' }, '2026-10-11')).toBe(false)
        expect(isValidArchiveRange({ from: '2026-02-27', to: '2026-02-30' }, '2026-10-11')).toBe(false)
    })

    it('covers the local days in whole UTC hours', () => {
        const london = getArchiveHours({ from: '2026-10-10', to: '2026-10-11' }, 'Europe/London')

        expect(london.start.toISOString()).toBe('2026-10-09T23:00:00.000Z')
        expect(london.end.toISOString()).toBe('2026-10-11T23:00:00.000Z')

        const kolkata = getArchiveHours({ from: '2026-10-10', to: '2026-10-10' }, 'Asia/Kolkata')

        expect(kolkata.start.toISOString()).toBe('2026-10-09T18:00:00.000Z')
        expect(kolkata.end.toISOString()).toBe('2026-10-10T19:00:00.000Z')
    })
})

describe('resolveArchiveRange', () => {
    it('keeps a stored period the API still accepts', () => {
        const stored = { from: '2026-09-30', to: '2026-10-11' }

        expect(resolveArchiveRange(stored, NOW, 'Europe/London')).toBe(stored)
    })

    it('falls back to the week up to yesterday without a period or with one the API no longer accepts', () => {
        const week = { from: '2026-10-05', to: '2026-10-11' }

        expect(resolveArchiveRange(null, NOW, 'Europe/London')).toEqual(week)
        expect(resolveArchiveRange({ from: '2026-10-10', to: '2026-10-12' }, NOW, 'Europe/London')).toEqual(week)
        expect(resolveArchiveRange({ from: '2026-09-01', to: '2026-09-20' }, NOW, 'Europe/London')).toEqual(week)
    })
})

describe('formatArchiveRange', () => {
    it('reads DD.MM.YYYY whatever the language', () => {
        expect(formatArchiveDate('1940-01-01')).toBe('01.01.1940')
        expect(formatArchiveRange({ from: '2026-10-06', to: '2026-10-12' })).toBe('06.10.2026 – 12.10.2026')
    })
})

describe('getArchiveRangeKey', () => {
    it('tells periods apart', () => {
        expect(getArchiveRangeKey({ from: '2026-10-06', to: '2026-10-12' })).toBe('2026-10-06|2026-10-12')
        expect(getArchiveRangeKey({ from: '2026-10-06', to: '2026-10-11' })).not.toBe(
            getArchiveRangeKey({ from: '2026-10-06', to: '2026-10-12' }),
        )
    })
})

describe('isEmptyArchive', () => {
    const withTemps = (temp: (number | null)[]): Pick<ArchiveResponse, 'values'> => ({
        values: {
            temp,
            feels: [],
            wind: [],
            gusts: [],
            windDir: [],
            pressure: [],
            precip: [],
            humidity: [],
            cloud: [],
        },
    })

    it('is empty only when no hour has a temperature', () => {
        expect(isEmptyArchive(withTemps([null, null]))).toBe(true)
        expect(isEmptyArchive(withTemps([null, 4.2]))).toBe(false)
    })
})

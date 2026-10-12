import { describe, expect, it } from 'vitest'
import {
    adjustArchiveRange,
    countArchiveDays,
    getArchiveHours,
    getDefaultArchiveRange,
    getLatestArchiveDate,
    isValidArchiveRange,
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

describe('adjustArchiveRange', () => {
    const LATEST = '2026-10-11'

    it('moves the other end to keep at most twelve days in order', () => {
        expect(adjustArchiveRange({ from: '2026-09-01', to: '2026-10-11' }, 'from', LATEST)).toEqual({
            from: '2026-09-01',
            to: '2026-09-12',
        })
        expect(adjustArchiveRange({ from: '2026-09-01', to: '2026-10-11' }, 'to', LATEST)).toEqual({
            from: '2026-09-30',
            to: '2026-10-11',
        })
        expect(adjustArchiveRange({ from: '2026-10-08', to: '2026-10-05' }, 'from', LATEST)).toEqual({
            from: '2026-10-08',
            to: '2026-10-08',
        })
    })

    it('keeps both ends between 1940 and yesterday', () => {
        expect(adjustArchiveRange({ from: '2026-10-20', to: '2026-10-25' }, 'from', LATEST)).toEqual({
            from: '2026-10-11',
            to: '2026-10-11',
        })
        expect(adjustArchiveRange({ from: '1900-01-01', to: '1940-01-05' }, 'from', LATEST)).toEqual({
            from: '1940-01-01',
            to: '1940-01-05',
        })
    })
})

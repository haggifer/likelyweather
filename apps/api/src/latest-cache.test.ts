import { getLatestMaxAge } from './latest-cache'

const FETCHED_AT = '2030-01-01T06:00:00.000Z'

describe('getLatestMaxAge', () => {
    it('shares a fresh run for five minutes', () => {
        expect(getLatestMaxAge(FETCHED_AT, new Date('2030-01-01T06:10:00Z'))).toBe(300)
    })

    it('shortens the share to the seconds left until the run is due', () => {
        expect(getLatestMaxAge(FETCHED_AT, new Date('2030-01-01T08:58:00Z'))).toBe(120)
    })

    it('does not share a run that is due for a refresh', () => {
        expect(getLatestMaxAge(FETCHED_AT, new Date('2030-01-01T09:00:00Z'))).toBeNull()
    })
})

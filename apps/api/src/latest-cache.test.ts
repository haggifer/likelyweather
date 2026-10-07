import { StoredSnapshotMeta } from '@fa/server/store'
import { getLatestMaxAge } from './latest-cache'

const OK_RUN: StoredSnapshotMeta = {
    cityId: 1,
    issueTime: '2030-01-01T06:00:00.000Z',
    runId: 'run',
    fetchedAt: '2030-01-01T06:00:00.000Z',
    runStatus: 'OK',
}
const PARTIAL_RUN: StoredSnapshotMeta = { ...OK_RUN, runStatus: 'PARTIAL' }

describe('getLatestMaxAge', () => {
    it('shares a fresh run for five minutes', () => {
        expect(getLatestMaxAge(OK_RUN, new Date('2030-01-01T06:10:00Z'))).toBe(300)
    })

    it('shortens the share to the seconds left until the run is due', () => {
        expect(getLatestMaxAge(OK_RUN, new Date('2030-01-01T08:58:00Z'))).toBe(120)
    })

    it('does not share a run that is due for a refresh', () => {
        expect(getLatestMaxAge(OK_RUN, new Date('2030-01-01T09:00:00Z'))).toBeNull()
    })

    it('shares a partial run only until its retry', () => {
        expect(getLatestMaxAge(PARTIAL_RUN, new Date('2030-01-01T06:10:00Z'))).toBe(300)
        expect(getLatestMaxAge(PARTIAL_RUN, new Date('2030-01-01T06:12:00Z'))).toBe(180)
    })

    it('does not share a partial run that is due for its retry', () => {
        expect(getLatestMaxAge(PARTIAL_RUN, new Date('2030-01-01T06:20:00Z'))).toBeNull()
    })
})

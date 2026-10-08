// Its own file, not cities.test.ts: these tests mock './store', which the database suite there needs real.
import { City } from '@fa/shared/api'
import { ensureFreshSnapshot } from './cities'
import { collect } from './collector'
import { HttpError } from './errors'
import { trySpendQuota } from './quota'
import { getLatestSnapshotMeta, Run, StoredSnapshotMeta } from './store'

vi.mock('./store', () => ({ getLatestSnapshotMeta: vi.fn(async () => null) }))
vi.mock('./collector', () => ({ collect: vi.fn() }))
vi.mock('./retention', () => ({ pruneExpiredForecasts: vi.fn(async () => {}) }))
vi.mock('./quota', async (importOriginal) => ({
    ...(await importOriginal<typeof import('./quota')>()),
    trySpendQuota: vi.fn(),
}))

const CITY: City = {
    id: 7,
    slug: 'claimtown-xx-7',
    name: 'Claimtown',
    country: 'Testland',
    countryCode: 'XX',
    lat: 1,
    lon: 2,
    timezone: 'UTC',
}

const SNAPSHOT = {
    cityId: CITY.id,
    issueTime: '2030-01-01T06:00:00.000Z',
    runId: 'preview-7-20300101T0600Z',
    fetchedAt: '2030-01-01T07:00:00.000Z',
    steps: [],
    models: {},
}

// Fetched long ago against the real clock, so `isFreshSnapshot` says it is due and the refresh path runs.
const STORED: StoredSnapshotMeta = { ...SNAPSHOT, fetchedAt: '2020-01-01T01:00:00.000Z', runStatus: 'OK' }

describe('ensureFreshSnapshot', () => {
    beforeEach(() => {
        vi.mocked(collect).mockResolvedValue({ run: { status: 'PARTIAL' } as Run, snapshot: SNAPSHOT })
    })

    afterEach(() => {
        vi.clearAllMocks()
        vi.restoreAllMocks()
    })

    it('frees the refresh for the next viewer when the first one has no quota left', async () => {
        vi.mocked(trySpendQuota).mockResolvedValueOnce(false).mockResolvedValueOnce(true)

        await expect(ensureFreshSnapshot(CITY, 'poor')).rejects.toMatchObject({
            status: 429,
        } satisfies Partial<HttpError>)

        const served = await ensureFreshSnapshot(CITY, 'rich')

        expect(served).toMatchObject({ fetchedAt: SNAPSHOT.fetchedAt, runStatus: 'PARTIAL' })
        expect(collect).toHaveBeenCalledTimes(1)
    })

    it('logs a refresh that failed before serving the stored run', async () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {})
        vi.mocked(getLatestSnapshotMeta).mockResolvedValueOnce({ ...STORED, cityId: 8 })
        vi.mocked(collect).mockRejectedValueOnce(new Error('partition DDL failed'))

        const served = await ensureFreshSnapshot({ ...CITY, id: 8 })

        expect(served.fetchedAt).toBe(STORED.fetchedAt)
        expect(error).toHaveBeenCalledWith(expect.stringContaining('partition DDL failed'))
    })
})

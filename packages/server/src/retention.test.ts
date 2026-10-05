import { dropExpiredForecastPartitions } from '@fa/db/partitions'
import { pruneExpiredForecasts } from './retention'
import { deleteSnapshotsBefore } from './store'

vi.mock('@fa/db/partitions', () => ({ dropExpiredForecastPartitions: vi.fn(async () => []) }))
vi.mock('./store', () => ({ deleteSnapshotsBefore: vi.fn(async () => ({ count: 0 })) }))

const DAY_ONE = new Date('2030-01-01T09:00:00Z')

describe('pruneExpiredForecasts', () => {
    it('prunes once per UTC day, keeping the last 14 days of snapshots', async () => {
        await pruneExpiredForecasts(DAY_ONE)
        await pruneExpiredForecasts(new Date('2030-01-01T23:00:00Z'))
        await pruneExpiredForecasts(new Date('2030-01-02T00:30:00Z'))

        expect(dropExpiredForecastPartitions).toHaveBeenCalledTimes(2)
        expect(deleteSnapshotsBefore).toHaveBeenCalledTimes(2)
        expect(deleteSnapshotsBefore).toHaveBeenNthCalledWith(1, new Date('2029-12-18T09:00:00Z'))
    })
})

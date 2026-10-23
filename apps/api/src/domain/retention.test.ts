import { pruneExpiredForecasts } from './retention'
import { deleteSnapshotsBefore, dropExpiredForecastPartitions } from './store'

vi.mock('./store', () => ({
    dropExpiredForecastPartitions: vi.fn(async () => []),
    deleteSnapshotsBefore: vi.fn(async () => ({ count: 0 })),
    deleteRunsBefore: vi.fn(async () => ({ count: 0 })),
}))

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

    it('tries a failed prune again on the same day', async () => {
        const day = new Date('2030-02-01T09:00:00Z')
        vi.mocked(dropExpiredForecastPartitions).mockRejectedValueOnce(new Error('lock timeout'))

        await expect(pruneExpiredForecasts(day)).rejects.toThrow('lock timeout')
        await pruneExpiredForecasts(new Date('2030-02-01T10:00:00Z'))

        expect(deleteSnapshotsBefore).toHaveBeenLastCalledWith(new Date('2030-01-18T10:00:00Z'))
    })
})

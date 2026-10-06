import { ModelId } from '@fa/shared/models'
import { Variable } from '@fa/shared/variables'
import { getLatestPayload } from './latest'
import { getSnapshotGrid } from './store'

vi.mock('./store', () => ({ getSnapshotGrid: vi.fn() }))

const META = {
    cityId: 1,
    issueTime: '2030-01-01T06:00:00.000Z',
    runId: 'preview-1-20300101T0600Z',
    fetchedAt: '2030-01-01T07:00:00.000Z',
}

const grid = (temp: number) => ({ steps: ['2030-01-01T06:00Z'], models: { [ModelId.Gfs]: { temp: [temp] } } })

describe('getLatestPayload', () => {
    it('serves a refetch inside the same 6-hour run from the new fetch, not the cached one', async () => {
        vi.mocked(getSnapshotGrid)
            .mockResolvedValueOnce(grid(10) as never)
            .mockResolvedValueOnce(grid(12) as never)

        const first = await getLatestPayload(META, Variable.Temp)
        const second = await getLatestPayload({ ...META, fetchedAt: '2030-01-01T10:05:00.000Z' }, Variable.Temp)

        expect(first.series[0].values).toEqual([10])
        expect(second.fetchedAt).toBe('2030-01-01T10:05:00.000Z')
        expect(second.series[0].values).toEqual([12])
    })
})

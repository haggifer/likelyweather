import { getColdStartRefetch } from './cold-start-refetch'

const STARTED_AT = Date.parse('2026-10-07T09:00:00Z')
const NOW = new Date('2026-10-07T09:00:05Z')

const makeQuery = (key: string, dataUpdatedAt: number, fetchedAt?: string) =>
    ({
        queryKey: [key, 'kyiv-ua-703448', 'temp'],
        state: { dataUpdatedAt, data: fetchedAt ? { fetchedAt } : undefined },
    }) as never

describe('getColdStartRefetch', () => {
    const refetchOnMount = getColdStartRefetch(STARTED_AT, () => NOW)

    it('refetches a run restored from the last session once it is 3 hours old', () => {
        expect(refetchOnMount(makeQuery('latest', Date.parse('2026-10-06T20:00:00Z'), '2026-10-06T20:00:00Z'))).toBe(
            'always',
        )
    })

    it('keeps the default for a restored run that is not due yet', () => {
        expect(refetchOnMount(makeQuery('latest', Date.parse('2026-10-07T07:00:00Z'), '2026-10-07T07:00:00Z'))).toBe(
            true,
        )
    })

    it('keeps the default for a run fetched in this session, however old', () => {
        expect(refetchOnMount(makeQuery('latest', STARTED_AT + 1000, '2026-10-06T20:00:00Z'))).toBe(true)
    })

    it('keeps the default for other queries', () => {
        expect(refetchOnMount(makeQuery('quota', Date.parse('2026-10-06T20:00:00Z')))).toBe(true)
    })
})

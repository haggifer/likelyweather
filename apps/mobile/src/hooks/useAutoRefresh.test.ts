import { useAutoRefresh } from '@fa/hooks/useAutoRefresh'
import { renderHook } from '@testing-library/react-native'

interface Props {
    fetchedAt: string | undefined
    now: Date | null
    isInFront: boolean
}

const FETCHED_AT = '2026-10-30T09:00:00.000Z'
const LATER_RUN = '2026-10-30T12:05:00.000Z'
const BEFORE_DUE = new Date('2026-10-30T11:59:00.000Z')
const DUE = new Date('2026-10-30T12:00:00.000Z')

const renderAutoRefresh = (props: Props) => {
    const refresh = jest.fn()
    const rendered = renderHook((p: Props) => useAutoRefresh(p.fetchedAt, p.now, p.isInFront, refresh), {
        initialProps: props,
    })

    return { refresh, rendered }
}

describe('useAutoRefresh', () => {
    it('refreshes the moment Refresh is offered, 3 hours after the fetch', async () => {
        const { refresh, rendered } = renderAutoRefresh({ fetchedAt: FETCHED_AT, now: BEFORE_DUE, isInFront: true })
        const { rerender } = await rendered

        expect(refresh).not.toHaveBeenCalled()

        await rerender({ fetchedAt: FETCHED_AT, now: DUE, isInFront: true })

        expect(refresh).toHaveBeenCalledTimes(1)
    })

    it('waits while the app is in the background and refreshes when it comes back', async () => {
        const { refresh, rendered } = renderAutoRefresh({ fetchedAt: FETCHED_AT, now: DUE, isInFront: false })
        const { rerender } = await rendered

        expect(refresh).not.toHaveBeenCalled()

        await rerender({ fetchedAt: FETCHED_AT, now: DUE, isInFront: true })

        expect(refresh).toHaveBeenCalledTimes(1)
    })

    it('refreshes each run once, so a refetch that brings back the same run leaves Refresh to the reader', async () => {
        const { refresh, rendered } = renderAutoRefresh({ fetchedAt: FETCHED_AT, now: DUE, isInFront: true })
        const { rerender } = await rendered

        await rerender({ fetchedAt: FETCHED_AT, now: new Date('2026-10-30T12:01:00.000Z'), isInFront: true })

        expect(refresh).toHaveBeenCalledTimes(1)

        await rerender({ fetchedAt: LATER_RUN, now: new Date('2026-10-30T15:05:00.000Z'), isInFront: true })

        expect(refresh).toHaveBeenCalledTimes(2)
    })

    it('does nothing before a run or the clock is known', async () => {
        const { refresh, rendered } = renderAutoRefresh({ fetchedAt: undefined, now: DUE, isInFront: true })
        const { rerender } = await rendered

        await rerender({ fetchedAt: FETCHED_AT, now: null, isInFront: true })

        expect(refresh).not.toHaveBeenCalled()
    })
})

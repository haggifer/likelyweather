import { isRefreshOffered } from '@fa/api-client/refresh-due'
import { useEffect, useRef } from 'react'

// Refreshes the run on screen the moment Refresh is offered, as a press of it would, but only while the page or the app
// is in front: one in the background would spend the viewer's quota on a run nobody sees, and catches up when it comes
// back, since `now` ticks then. Each run is refreshed once at most: when the refetch brings back the same run (it
// failed, or the server's clock is behind the viewer's), Refresh is left for the reader to press.
export function useAutoRefresh(
    fetchedAt: string | undefined,
    now: Date | null,
    isInFront: boolean,
    refresh: () => void,
): void {
    const refreshedRef = useRef<string | null>(null)

    useEffect(() => {
        if (!fetchedAt || !isInFront || !isRefreshOffered(fetchedAt, now) || refreshedRef.current === fetchedAt) return

        refreshedRef.current = fetchedAt
        refresh()
        // `refresh` is a new function every render; the run, the clock and the page's place decide when to call it.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchedAt, now, isInFront])
}

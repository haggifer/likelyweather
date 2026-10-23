import { useSyncExternalStore } from 'react'

const TICK_MS = 60_000

let current = new Date()

// Browsers throttle timers in a hidden tab, so the clock also ticks when the tab is shown again; otherwise the now
// line would lag for up to a minute after the reader comes back.
const subscribe = (onChange: () => void) => {
    const tick = () => {
        current = new Date()
        onChange()
    }
    const handleVisibility = () => {
        if (document.visibilityState === 'visible') tick()
    }

    current = new Date()
    const timer = setInterval(tick, TICK_MS)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
        clearInterval(timer)
        document.removeEventListener('visibilitychange', handleVisibility)
    }
}

const getSnapshot = () => current

const getServerSnapshot = () => null

// Null during server rendering and hydration, so anything drawn from it (the "now" line, past/future splits) never
// mismatches the server HTML.
export function useNow(): Date | null {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

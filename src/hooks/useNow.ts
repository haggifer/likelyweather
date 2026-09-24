import { useSyncExternalStore } from 'react'

const TICK_MS = 60_000

let current = new Date()

const subscribe = (onChange: () => void) => {
    current = new Date()
    const timer = setInterval(() => {
        current = new Date()
        onChange()
    }, TICK_MS)

    return () => clearInterval(timer)
}

const getSnapshot = () => current

const getServerSnapshot = () => null

// The current time, refreshed every minute. It is null during server rendering and hydration so anything drawn
// from it (the "now" line, past/future splits) never mismatches the server HTML.
export default function useNow(): Date | null {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

import { useSyncExternalStore } from 'react'
import { AppState } from 'react-native'

const TICK_MS = 60_000

let current = new Date()

const subscribe = (onChange: () => void) => {
    const tick = () => {
        current = new Date()
        onChange()
    }
    const timer = setInterval(tick, TICK_MS)
    // Timers stop while the app is in the background; coming back moves the "now" line at once.
    const subscription = AppState.addEventListener('change', (state) => state === 'active' && tick())

    current = new Date()

    return () => {
        clearInterval(timer)
        subscription.remove()
    }
}

const getSnapshot = () => current

// The current time, refreshed every minute and whenever the app returns to the foreground.
export function useNow(): Date {
    return useSyncExternalStore(subscribe, getSnapshot)
}

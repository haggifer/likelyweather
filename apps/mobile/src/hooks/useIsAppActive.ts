import { useSyncExternalStore } from 'react'
import { AppState } from 'react-native'

const subscribe = (onChange: () => void) => {
    const subscription = AppState.addEventListener('change', onChange)

    return () => subscription.remove()
}

const getSnapshot = () => AppState.currentState === 'active'

// False while the app is in the background or behind the recent-apps screen.
export function useIsAppActive(): boolean {
    return useSyncExternalStore(subscribe, getSnapshot)
}

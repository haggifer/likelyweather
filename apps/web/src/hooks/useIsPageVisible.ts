import { useSyncExternalStore } from 'react'

const subscribe = (onChange: () => void) => {
    document.addEventListener('visibilitychange', onChange)

    return () => document.removeEventListener('visibilitychange', onChange)
}

const getSnapshot = () => document.visibilityState === 'visible'

const getServerSnapshot = () => false

// False in a background tab or a minimised window, and during server rendering.
export function useIsPageVisible(): boolean {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

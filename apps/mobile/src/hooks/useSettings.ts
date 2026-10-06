import { useSyncExternalStore } from 'react'
import { Settings, settingsStore } from '../lib/settings'

export function useSettings(): Settings {
    return useSyncExternalStore(settingsStore.subscribe, settingsStore.get)
}

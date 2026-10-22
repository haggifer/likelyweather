import { useSyncExternalStore } from 'react'
import { viewModeStore } from '../lib/view-mode-store'

export interface UseViewModeResult {
    isTable: boolean
    toggleTable: () => void
}

const toggleTable = () => viewModeStore.set((mode) => (mode === 'table' ? 'chart' : 'table'))

// The overview's, the archive's and the dashboard's chart or table, the last one picked on this device.
export function useViewMode(): UseViewModeResult {
    const mode = useSyncExternalStore(viewModeStore.subscribe, viewModeStore.get)

    return { isTable: mode === 'table', toggleTable }
}

import { useSyncExternalStore } from 'react'
import { viewModeStore } from '../lib/view-mode-store'

export interface UseViewModeResult {
    isTable: boolean
    toggleTable: () => void
}

const toggleTable = () => viewModeStore.set((mode) => (mode === 'table' ? 'chart' : 'table'))

export function useViewMode(): UseViewModeResult {
    const mode = useSyncExternalStore(viewModeStore.subscribe, viewModeStore.get)

    return { isTable: mode === 'table', toggleTable }
}

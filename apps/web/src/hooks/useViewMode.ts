import { viewModeStore } from '@/lib/view-mode-store'
import { useSyncExternalStore } from 'react'

export interface UseViewModeResult {
    isTable: boolean
    toggleTable: () => void
}

const toggleTable = () => viewModeStore.set((mode) => (mode === 'table' ? 'chart' : 'table'))

// The overview's, the archive's and the dashboard's chart or table, the last one picked on this device. The server
// renders the charts; a stored table applies right after hydration.
export function useViewMode(): UseViewModeResult {
    const mode = useSyncExternalStore(
        viewModeStore.subscribe,
        viewModeStore.getSnapshot,
        viewModeStore.getServerSnapshot,
    )

    return { isTable: mode === 'table', toggleTable }
}

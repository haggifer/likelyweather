import { overviewPanelsStore } from '@/lib/overview-panels-store'
import { OverviewPanels } from '@fa/shared/overview-panels'
import { useSyncExternalStore } from 'react'

export interface UseOverviewPanelsResult {
    panels: OverviewPanels
    setPanels: (update: (panels: OverviewPanels) => OverviewPanels) => void
}

export function useOverviewPanels(): UseOverviewPanelsResult {
    const panels = useSyncExternalStore(
        overviewPanelsStore.subscribe,
        overviewPanelsStore.getSnapshot,
        overviewPanelsStore.getServerSnapshot,
    )

    return { panels, setPanels: overviewPanelsStore.set }
}

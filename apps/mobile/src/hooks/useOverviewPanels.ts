import { OverviewPanels } from '@fa/shared/overview-panels'
import { settingsStore } from '../lib/settings'
import { useSettings } from './useSettings'

export interface UseOverviewPanelsResult {
    panels: OverviewPanels
    setPanels: (update: (panels: OverviewPanels) => OverviewPanels) => void
}

const setPanels = (update: (panels: OverviewPanels) => OverviewPanels) =>
    settingsStore.set((settings) => ({ ...settings, overviewPanels: update(settings.overviewPanels) }))

export function useOverviewPanels(): UseOverviewPanelsResult {
    const { overviewPanels } = useSettings()

    return { panels: overviewPanels, setPanels }
}

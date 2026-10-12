import { OverviewPanels } from '@fa/shared/overview-panels'
import { settingsStore } from '../lib/settings'
import { useSettings } from './useSettings'

export interface UseOverviewPanelsResult {
    panels: OverviewPanels
    setPanels: (update: (panels: OverviewPanels) => OverviewPanels) => void
}

const setPanels = (update: (panels: OverviewPanels) => OverviewPanels) =>
    settingsStore.set((settings) => ({ ...settings, overviewPanels: update(settings.overviewPanels) }))

// The overview's panels and their order, kept on the device with the other settings.
export function useOverviewPanels(): UseOverviewPanelsResult {
    const { overviewPanels } = useSettings()

    return { panels: overviewPanels, setPanels }
}

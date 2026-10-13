import { ArchiveSettings } from '@fa/shared/archive-settings'
import { useSyncExternalStore } from 'react'
import { archiveSettingsStore } from '../lib/archive-settings-store'

export interface UseArchiveSettingsResult {
    settings: ArchiveSettings
    setSettings: (update: (settings: ArchiveSettings) => ArchiveSettings) => void
}

export function useArchiveSettings(): UseArchiveSettingsResult {
    const settings = useSyncExternalStore(archiveSettingsStore.subscribe, archiveSettingsStore.get)

    return { settings, setSettings: archiveSettingsStore.set }
}

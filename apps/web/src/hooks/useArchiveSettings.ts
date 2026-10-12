import { ArchiveSettings, archiveSettingsStore } from '@/lib/archive-settings-store'
import { useSyncExternalStore } from 'react'

export interface UseArchiveSettingsResult {
    settings: ArchiveSettings
    setSettings: (update: (settings: ArchiveSettings) => ArchiveSettings) => void
}

export function useArchiveSettings(): UseArchiveSettingsResult {
    const settings = useSyncExternalStore(
        archiveSettingsStore.subscribe,
        archiveSettingsStore.getSnapshot,
        archiveSettingsStore.getServerSnapshot,
    )

    return { settings, setSettings: archiveSettingsStore.set }
}

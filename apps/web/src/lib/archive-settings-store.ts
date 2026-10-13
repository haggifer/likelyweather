import { ARCHIVE_SETTINGS_KEY, DEFAULT_ARCHIVE_SETTINGS, parseArchiveSettings } from '@fa/shared/archive-settings'
import { createStoredValue } from './stored-value'

export const archiveSettingsStore = createStoredValue(
    ARCHIVE_SETTINGS_KEY,
    parseArchiveSettings,
    DEFAULT_ARCHIVE_SETTINGS,
)

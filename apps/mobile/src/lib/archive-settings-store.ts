import { ARCHIVE_SETTINGS_KEY, parseArchiveSettings } from '@fa/shared/archive-settings'
import { createStoredValue } from './stored-value'

export const archiveSettingsStore = createStoredValue(ARCHIVE_SETTINGS_KEY, parseArchiveSettings)

import { ArchiveRange } from '@fa/shared/archive'
import { DEFAULT_OVERVIEW_PANELS, normalizeOverviewPanels, OverviewPanels } from '@fa/shared/overview-panels'
import { createStoredValue } from './stored-value'

// The Archive screen's own choices, as the web keeps them (`fa.archive`): its panels and the period last asked for.
// No period means the week up to yesterday, worked out when the screen opens.
export interface ArchiveSettings {
    panels: OverviewPanels
    range: ArchiveRange | null
}

const DEFAULT_ARCHIVE_SETTINGS: ArchiveSettings = { panels: DEFAULT_OVERVIEW_PANELS, range: null }
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/

const isRange = (value: unknown): value is ArchiveRange => {
    const range = value as Partial<ArchiveRange> | null

    return (
        typeof range?.from === 'string' &&
        typeof range.to === 'string' &&
        DATE_KEY.test(range.from) &&
        DATE_KEY.test(range.to)
    )
}

export const parseArchiveSettings = (raw: string | null): ArchiveSettings => {
    try {
        const stored = JSON.parse(raw ?? 'null')

        return {
            panels: normalizeOverviewPanels(stored?.panels),
            range: isRange(stored?.range) ? stored.range : null,
        }
    } catch {
        return DEFAULT_ARCHIVE_SETTINGS
    }
}

export const archiveSettingsStore = createStoredValue('fa.archive', parseArchiveSettings)

import { ArchiveRange } from './archive'
import { DEFAULT_OVERVIEW_PANELS, normalizeOverviewPanels, OverviewPanels } from './overview-panels'

// The archive's own choices, kept per device under one key (`fa.archive`, listed in the privacy policy): its panels
// and the period last asked for. No period means the week up to yesterday, worked out when the archive opens.
export interface ArchiveSettings {
    panels: OverviewPanels
    range: ArchiveRange | null
}

export const ARCHIVE_SETTINGS_KEY = 'fa.archive'
export const DEFAULT_ARCHIVE_SETTINGS: ArchiveSettings = { panels: DEFAULT_OVERVIEW_PANELS, range: null }
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

// Repairs whatever is stored (an older version, or nothing). A period in the wrong shape is dropped here; one the API
// no longer accepts (too old, too long) is replaced when the archive opens (`resolveArchiveRange`).
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

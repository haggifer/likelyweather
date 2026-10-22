// Whether the overview, the archive and the dashboard show their numbers as charts or as tables. The last choice is
// kept per device under one key (`fa.viewMode`, listed in the privacy policy) and opens every view the same way.
export type ViewMode = 'chart' | 'table'

export const VIEW_MODE_KEY = 'fa.viewMode'
export const DEFAULT_VIEW_MODE: ViewMode = 'chart'

// Anything but a stored "table" (nothing, an older value, broken JSON) opens the charts.
export const parseViewMode = (raw: string | null): ViewMode => {
    try {
        return JSON.parse(raw ?? 'null') === 'table' ? 'table' : DEFAULT_VIEW_MODE
    } catch {
        return DEFAULT_VIEW_MODE
    }
}

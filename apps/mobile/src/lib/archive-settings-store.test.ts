import { DEFAULT_OVERVIEW_PANELS } from '@fa/shared/overview-panels'
import { Variable } from '@fa/shared/variables'
import { parseArchiveSettings } from './archive-settings-store'

const RANGE = { from: '2026-10-01', to: '2026-10-07' }

describe('parseArchiveSettings', () => {
    it('reads stored panels and a period', () => {
        const panels = { ...DEFAULT_OVERVIEW_PANELS, hidden: [Variable.Cloud] }

        expect(parseArchiveSettings(JSON.stringify({ panels, range: RANGE }))).toEqual({ panels, range: RANGE })
    })

    it('starts with the default panels and no period', () => {
        expect(parseArchiveSettings(null)).toEqual({ panels: DEFAULT_OVERVIEW_PANELS, range: null })
        expect(parseArchiveSettings('not json')).toEqual({ panels: DEFAULT_OVERVIEW_PANELS, range: null })
    })

    it('drops a period that is not two dates and repairs the panels', () => {
        const stored = { panels: 'all', range: { from: '2026-10-01', to: 7 } }

        expect(parseArchiveSettings(JSON.stringify(stored))).toEqual({ panels: DEFAULT_OVERVIEW_PANELS, range: null })
        expect(
            parseArchiveSettings(JSON.stringify({ range: { from: '1.10.2026', to: '2026-10-07' } })).range,
        ).toBeNull()
    })
})

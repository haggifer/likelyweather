import { DEFAULT_OVERVIEW_PANELS, parseOverviewPanels } from '@fa/shared/overview-panels'
import { createStoredValue } from './stored-value'

// The overview panels the reader shows and their order (`fa.overview`, listed in the privacy policy).
export const overviewPanelsStore = createStoredValue('fa.overview', parseOverviewPanels, DEFAULT_OVERVIEW_PANELS)

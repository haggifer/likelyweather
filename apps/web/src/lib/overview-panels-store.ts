import { DEFAULT_OVERVIEW_PANELS, parseOverviewPanels } from '@fa/shared/overview-panels'
import { createStoredValue } from './stored-value'

// `fa.overview` is listed in the privacy policy.
export const overviewPanelsStore = createStoredValue('fa.overview', parseOverviewPanels, DEFAULT_OVERVIEW_PANELS)

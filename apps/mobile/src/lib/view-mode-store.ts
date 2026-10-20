import { parseViewMode, VIEW_MODE_KEY } from '@fa/shared/view-mode'
import { createStoredValue } from './stored-value'

export const viewModeStore = createStoredValue(VIEW_MODE_KEY, parseViewMode)

import { ArchiveResponse } from '@fa/shared/api'
import { OVERVIEW_VARIABLES } from '@fa/shared/variables'
import { OverviewMedians } from './overview-stats'

// The archive's own hours, as `toPeriodArchive` leaves them: precipitation already belongs to the hour after each step,
// the way the forecasts' slots read their sums.
export const getArchiveHourlySeries = (archive: ArchiveResponse): OverviewMedians =>
    Object.fromEntries(
        OVERVIEW_VARIABLES.map((variable) => [variable, { steps: archive.steps, values: archive.values[variable] }]),
    )

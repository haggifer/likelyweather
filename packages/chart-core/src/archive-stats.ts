import { ArchiveResponse } from '@fa/shared/api'
import { toSlotSeries } from '@fa/shared/slots'
import { OVERVIEW_VARIABLES, VARIABLE_BY_ID } from '@fa/shared/variables'
import { OverviewMedians } from './overview-stats'

// The archive's hours on the overview's 3-hour slots, so the overview chart draws past weather as it draws the median
// of the forecasts: instants at each slot, sums over the 3 hours after it. Its field names are the variables' ids.
export const getArchiveSeries = (archive: ArchiveResponse, slots: string[]): OverviewMedians =>
    Object.fromEntries(
        OVERVIEW_VARIABLES.map((variable) => [
            variable,
            {
                steps: slots,
                values: toSlotSeries(
                    archive.steps,
                    archive.values[variable],
                    slots,
                    VARIABLE_BY_ID[variable].aggregation,
                ),
            },
        ]),
    )

export const getArchiveDirections = (archive: ArchiveResponse, slots: string[]) =>
    toSlotSeries(archive.steps, archive.values.windDir, slots, 'instant')

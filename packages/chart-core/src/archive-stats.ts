import { ArchiveResponse } from '@fa/shared/api'
import { indexSteps, toStepSeries } from '@fa/shared/resample'
import { addHours, toIsoMinute } from '@fa/shared/time'
import { OVERVIEW_VARIABLES, VARIABLE_BY_ID } from '@fa/shared/variables'
import { OverviewMedians } from './overview-stats'

// The archive's own hours: instants as they are, and precipitation as the hour after each step, which Open-Meteo
// stamps at that hour's end; the forecasts' slots read sums the same way.
export const getArchiveHourlySeries = (archive: ArchiveResponse): OverviewMedians => {
    const index = indexSteps(archive.steps)
    const hourEnds = archive.steps.map((step) => toIsoMinute(addHours(new Date(step), 1)))

    return Object.fromEntries(
        OVERVIEW_VARIABLES.map((variable) => {
            const values = archive.values[variable]
            const isSum = VARIABLE_BY_ID[variable].aggregation === 'sum'

            return [
                variable,
                { steps: archive.steps, values: isSum ? toStepSeries(index, values, hourEnds, 'sum', 1) : values },
            ]
        }),
    )
}

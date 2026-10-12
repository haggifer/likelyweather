import { LatestResponse } from '@fa/shared/api'
import { computeChanceOfRain, computeEnsemble, computeMedianDirection } from '@fa/shared/ensemble'
import { toSlotSeries } from '@fa/shared/slots'
import { OVERVIEW_VARIABLES, OverviewVariable, Variable, VARIABLE_BY_ID } from '@fa/shared/variables'

export interface MedianSeries {
    steps: string[]
    values: (number | null)[]
}

export type OverviewHourly = Record<OverviewVariable, LatestResponse>

const toSlots = ({ steps, series }: LatestResponse, slots: string[], variable: Variable) =>
    series.map((s) => toSlotSeries(steps, s.values, slots, VARIABLE_BY_ID[variable].aggregation))

// The landing overview's numbers, the same on the web and in the app: the median of all models per 3-hour slot for
// every variable it draws, the median wind direction, and the share of models above 0.2 mm in each slot.
export const getOverviewMedians = (hourly: OverviewHourly, slots: string[]) =>
    Object.fromEntries(
        OVERVIEW_VARIABLES.map((variable) => [
            variable,
            { steps: slots, values: computeEnsemble(toSlots(hourly[variable], slots, variable), slots.length).median },
        ]),
    ) as Record<OverviewVariable, MedianSeries>

export const getOverviewDirections = (wind: LatestResponse, slots: string[]) =>
    wind.directions
        ? computeMedianDirection(
              wind.directions.map((d) => toSlotSeries(wind.steps, d.values, slots, 'instant')),
              slots.length,
          )
        : null

export const getOverviewChance = (precip: LatestResponse, slots: string[]) =>
    computeChanceOfRain(toSlots(precip, slots, Variable.Precip), slots.length)

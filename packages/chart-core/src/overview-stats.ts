import { LatestResponse } from '@fa/shared/api'
import { computeChanceOfRain, computeEnsemble, computeMedianDirection } from '@fa/shared/ensemble'
import { toSlotSeries } from '@fa/shared/slots'
import { OVERVIEW_VARIABLES, OverviewVariable, Variable, VARIABLE_BY_ID } from '@fa/shared/variables'

export interface MedianSeries {
    steps: string[]
    values: (number | null)[]
}

// The runs of the variables the reader's panels draw; the others are never fetched.
export type OverviewHourly = Partial<Record<OverviewVariable, LatestResponse>>

export type OverviewMedians = Partial<Record<OverviewVariable, MedianSeries>>

const toSlots = ({ steps, series }: LatestResponse, slots: string[], variable: Variable) =>
    series.map((s) => toSlotSeries(steps, s.values, slots, VARIABLE_BY_ID[variable].aggregation))

// The landing overview's numbers, the same on the web and in the app: the median of all models per 3-hour slot for
// every variable it draws, the median wind direction, and the share of models above 0.2 mm in each slot.
export const getOverviewMedians = (hourly: OverviewHourly, slots: string[]): OverviewMedians =>
    Object.fromEntries(
        OVERVIEW_VARIABLES.flatMap((variable) => {
            const latest = hourly[variable]

            return latest
                ? [
                      [
                          variable,
                          {
                              steps: slots,
                              values: computeEnsemble(toSlots(latest, slots, variable), slots.length).median,
                          },
                      ],
                  ]
                : []
        }),
    )

export const getOverviewDirections = (wind: LatestResponse | undefined, slots: string[]) =>
    wind?.directions
        ? computeMedianDirection(
              wind.directions.map((d) => toSlotSeries(wind.steps, d.values, slots, 'instant')),
              slots.length,
          )
        : null

export const getOverviewChance = (precip: LatestResponse | undefined, slots: string[]) =>
    precip ? computeChanceOfRain(toSlots(precip, slots, Variable.Precip), slots.length) : []

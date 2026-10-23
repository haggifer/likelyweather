import { LatestResponse } from '@fa/shared/api'
import { computeChanceOfRain, computeEnsemble, computeMedianDirection } from '@fa/shared/ensemble'
import { hasValues } from '@fa/shared/has-values'
import { getPanelDataVariables, PanelVariable } from '@fa/shared/overview-panels'
import { buildSlots, toSlotSeries } from '@fa/shared/slots'
import { OVERVIEW_VARIABLES, OverviewVariable, Variable, VARIABLE_BY_ID } from '@fa/shared/variables'

export interface MedianSeries {
    steps: string[]
    values: (number | null)[]
}

// The runs of the variables the reader's panels draw; the others are never fetched.
export type OverviewHourly = Partial<Record<OverviewVariable, LatestResponse>>

export type OverviewMedians = Partial<Record<OverviewVariable, MedianSeries>>

export interface OverviewSeries {
    medians: OverviewMedians
    directions: (number | null)[] | null
    chance: (number | null)[]
}

// A query result of `useHourlyAll`, one per overview variable in `OVERVIEW_VARIABLES` order.
interface HourlyResult {
    data?: LatestResponse
}

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

const getOverviewDirections = (wind: LatestResponse | undefined, slots: string[]) =>
    wind?.directions
        ? computeMedianDirection(
              wind.directions.map((d) => toSlotSeries(wind.steps, d.values, slots, 'instant')),
              slots.length,
          )
        : null

export const getOverviewChance = (precip: LatestResponse | undefined, slots: string[]) =>
    precip ? computeChanceOfRain(toSlots(precip, slots, Variable.Precip), slots.length) : []

export const getHourlyByVariable = (results: HourlyResult[]): OverviewHourly =>
    Object.fromEntries(
        OVERVIEW_VARIABLES.flatMap((variable, i) => {
            const data = results[i]?.data

            return data ? [[variable, data]] : []
        }),
    )

// A panel is drawn once its series and its second line have arrived.
export const getReadyPanels = (panels: PanelVariable[], hourly: OverviewHourly) =>
    panels.filter((panel) => getPanelDataVariables([panel]).every((variable) => hourly[variable]))

// The runs of the shown panels come from one fetch, so any of them carries the run's times and model count.
export const getOverviewRun = (hourly: OverviewHourly, panels: PanelVariable[]) => hourly[panels[0]]

// Everything the overview chart draws, from the local 3-hour slot the run was fetched in (`anchor`).
export const getOverviewSeries = (hourly: OverviewHourly, anchor: Date): OverviewSeries => {
    const slots = buildSlots(anchor)

    return {
        medians: getOverviewMedians(hourly, slots),
        directions: getOverviewDirections(hourly[Variable.Wind], slots),
        chance: getOverviewChance(hourly[Variable.Precip], slots),
    }
}

export const hasOverviewValues = (medians: OverviewMedians) =>
    Object.values(medians).some((s) => s !== undefined && hasValues(s.values))

import { LatestResponse, Series } from './api'
import { indexSteps, toStepSeries } from './resample'
import { addHours, floorToHours, getLocalHour, toIsoMinute } from './time'
import { Aggregation } from './variables'

export const SLOT_HOURS = 3
// Both views cover ten days; a run reaches 320 hours past its issue time, so ten days from the slot it was fetched in
// are always inside it. Two constants, so either view can be shortened on its own.
const OVERVIEW_HOURS = 240
export const DASHBOARD_HOURS = 240

// Start of the local 3-hour slot containing `date` (local 00, 03, 06…). Slots stay on whole UTC hours, where the
// hourly data lives, so a half-hour time zone gets slots at :30 local.
export const getSlotStart = (date: Date, timeZone: string) => {
    const hour = floorToHours(date, 1)

    return addHours(hour, -(getLocalHour(hour, timeZone) % SLOT_HOURS))
}

// Charts start where their data starts: data fetched 19 hours ago gives a chart that starts 19 hours ago.
export const getChartStart = (latest: Pick<LatestResponse, 'fetchedAt'>, timeZone: string) =>
    getSlotStart(new Date(latest.fetchedAt), timeZone)

// Evenly spaced from `start`: after a DST change inside the window the later slots sit one hour off the local
// 00/03/06 marks until the next refresh re-anchors them.
export const buildSlots = (start: Date, hours = OVERVIEW_HOURS) =>
    Array.from({ length: hours / SLOT_HOURS + 1 }, (_, i) => toIsoMinute(addHours(start, i * SLOT_HOURS)))

// Instants are read at each slot. Sums cover the 3 hours that follow the slot, so the first slot of a fresh chart
// reads as the coming 3 hours rather than the ones that have already passed.
export const toSlotSeries = (
    hourlySteps: string[],
    values: (number | null)[],
    slots: string[],
    aggregation: Aggregation,
) =>
    toStepSeries(
        indexSteps(hourlySteps),
        values,
        aggregation === 'sum' ? slots.map((s) => toIsoMinute(addHours(new Date(s), SLOT_HOURS))) : slots,
        aggregation,
        SLOT_HOURS,
    )

export const toSlotLatest = (latest: LatestResponse, slots: string[], aggregation: Aggregation): LatestResponse => {
    const toSlots = (list: Series[], listAggregation: Aggregation) =>
        list.map((s) => ({ modelId: s.modelId, values: toSlotSeries(latest.steps, s.values, slots, listAggregation) }))

    return {
        ...latest,
        steps: slots,
        series: toSlots(latest.series, aggregation),
        directions: latest.directions ? toSlots(latest.directions, 'instant') : undefined,
    }
}

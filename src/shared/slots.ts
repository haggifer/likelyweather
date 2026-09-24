import { indexSteps, toStepSeries } from '@/shared/resample'
import { addHours, floorToHours, getLocalHour, toIsoMinute } from '@/shared/time'
import { Aggregation } from '@/shared/variables'

export const SLOT_HOURS = 3
export const OVERVIEW_HOURS = 72

// Start of the local 3-hour slot containing `date` (local 00, 03, 06…). Slots stay on whole UTC hours, where the
// hourly data lives, so a half-hour time zone gets slots at :30 local.
export const getSlotStart = (date: Date, timeZone: string) => {
    const hour = floorToHours(date, 1)

    return addHours(hour, -(getLocalHour(hour, timeZone) % SLOT_HOURS))
}

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

import { HOUR_MS } from '@fa/shared/constants'
import { SLOT_HOURS } from '@fa/shared/slots'
import { getNearestIndex, getSpanIndex } from './spaghetti-geometry'

const SLOT_MS = SLOT_HOURS * HOUR_MS

// The slot a readout follows: the hovered one, else the one for `now`. An instant reads at the nearest slot; a sum
// covers the 3 hours after its slot, so it reads at the slot whose span contains `now`, like a bar under the pointer.
export const getReadoutIndex = (steps: string[], hoverIndex: number, now: Date | null, isSum = false) => {
    if (hoverIndex >= 0) return hoverIndex

    if (!now) return 0

    const times = steps.map((s) => new Date(s))

    return isSum ? getSpanIndex(times, now, SLOT_MS) : getNearestIndex(times, now)
}

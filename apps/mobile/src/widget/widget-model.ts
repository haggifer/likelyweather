import { getDashboardStats, getEnsembleStats } from '@fa/chart-core/dashboard-stats'
import { getNearestIndex } from '@fa/chart-core/spaghetti-geometry'
import { LatestResponse } from '@fa/shared/api'
import { HOUR_MS } from '@fa/shared/constants'
import { DisagreementLabel } from '@fa/shared/ensemble'
import { Place } from '@fa/shared/places'
import { buildSlots, getChartStart, getSlotStart, SLOT_HOURS, toSlotLatest } from '@fa/shared/slots'
import { Variable } from '@fa/shared/variables'

export interface WidgetCity extends Place {
    timezone: string
}

export interface WidgetData {
    temp: LatestResponse
    wind?: LatestResponse
    precip?: LatestResponse
}

// Numbers only: the widget formats them in the reader's language and recomputes the age when it draws, so a model
// saved for offline use stays right.
export interface WidgetModel {
    city: WidgetCity
    fetchedAt: string
    temp: number | null
    tempMin: number | null
    tempMax: number | null
    label: DisagreementLabel | null
    wind: number | null
    precipTotal: number | null
}

const SUMMARY_HOURS = 24
const SLOTS_PER_DAY = SUMMARY_HOURS / SLOT_HOURS

const toSlots = (latest: LatestResponse, timeZone: string, variable: Variable) =>
    toSlotLatest(latest, buildSlots(getChartStart(latest, timeZone)), variable === Variable.Precip ? 'sum' : 'instant')

const getMedianAt = (latest: LatestResponse, now: Date) => {
    if (!latest.steps.length) return null

    const index = getNearestIndex(
        latest.steps.map((s) => new Date(s)),
        now,
    )

    return getEnsembleStats(latest).median[index] ?? null
}

// The next 24 hours from the current local slot, as the overview's readouts summarise them.
const getNext24 = (latest: LatestResponse, from: Date) => {
    const median = getEnsembleStats(latest).median
    const end = from.getTime() + SUMMARY_HOURS * HOUR_MS

    return latest.steps.flatMap((step, i) => {
        const t = new Date(step).getTime()
        const v = median[i]

        return t >= from.getTime() && t < end && v !== null ? [v] : []
    })
}

const getMin = (values: number[]) => (values.length ? Math.min(...values) : null)

const getMax = (values: number[]) => (values.length ? Math.max(...values) : null)

// A total over fewer slots than a day holds would read drier than it is, so it is unknown instead.
const getTotal = (values: number[]) => (values.length >= SLOTS_PER_DAY ? values.reduce((sum, v) => sum + v, 0) : null)

// Today's disagreement label and the current medians, with the same shared maths as the app and the web.
export const buildWidgetModel = (city: WidgetCity, data: WidgetData, now: Date): WidgetModel => {
    const temp = toSlots(data.temp, city.timezone, Variable.Temp)
    const wind = data.wind ? toSlots(data.wind, city.timezone, Variable.Wind) : null
    const precip = data.precip ? toSlots(data.precip, city.timezone, Variable.Precip) : null
    const from = getSlotStart(now, city.timezone)
    const next24 = getNext24(temp, from)
    const today = getDashboardStats(temp, Variable.Temp, city.timezone, now).disagreement[0]

    return {
        city,
        fetchedAt: data.temp.fetchedAt,
        temp: getMedianAt(temp, now),
        tempMin: getMin(next24),
        tempMax: getMax(next24),
        label: today?.label ?? null,
        wind: wind ? getMedianAt(wind, now) : null,
        precipTotal: precip ? getTotal(getNext24(precip, from)) : null,
    }
}

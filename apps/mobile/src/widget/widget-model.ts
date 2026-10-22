import { getNearestIndex } from '@fa/chart-core/spaghetti-geometry'
import { CurrentResponse, LatestResponse } from '@fa/shared/api'
import { HOUR_MS } from '@fa/shared/constants'
import { getDashboardStats, getEnsembleStats } from '@fa/shared/dashboard'
import { DisagreementLabel } from '@fa/shared/ensemble'
import { Coordinates } from '@fa/shared/geo'
import { Place } from '@fa/shared/places'
import { buildSlots, getChartStart, getSlotStart, SLOT_HOURS, toSlotLatest } from '@fa/shared/slots'
import { getTemperatureTrend, TemperatureTrend, TREND_HOURS } from '@fa/shared/temperature-trend'
import { getLocalDateKey } from '@fa/shared/time'
import { Variable } from '@fa/shared/variables'
import { getWeatherCondition, WeatherCondition } from '@fa/shared/weather-condition'

export interface WidgetCity extends Place {
    // null until the city record has been read: a widget placed offline knows only the stored place.
    timezone: string | null
    // Where the sun is decides between a sun and a moon; absent until the city record has been read.
    coordinates?: Coordinates
}

export interface WidgetData {
    temp: LatestResponse
    wind?: LatestResponse
    precip?: LatestResponse
    cloud?: LatestResponse
    current?: CurrentResponse | null
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
    // The local day the label is about: the first day with slots still ahead when the model was built.
    labelDay: string | null
    wind: number | null
    precipTotal: number | null
    // The current slot's sky from the medians, and where the median temperature goes next, for the clock widget.
    condition?: WeatherCondition | null
    trend?: TemperatureTrend | null
    // The clock widget's temperature now, from a nearby station when there is one; the medians only set its trend.
    current?: CurrentResponse | null
}

const SUMMARY_HOURS = 24
const SLOTS_PER_DAY = SUMMARY_HOURS / SLOT_HOURS
// The widget reads only the coming day's numbers, so it slots the run's first three days, not the charts' ten.
const WIDGET_HOURS = 72

const toSlots = (latest: LatestResponse, timeZone: string, variable: Variable) =>
    toSlotLatest(
        latest,
        buildSlots(getChartStart(latest, timeZone), WIDGET_HOURS),
        variable === Variable.Precip ? 'sum' : 'instant',
    )

const getMedianAt = (latest: LatestResponse, now: Date) => {
    if (!latest.steps.length) return null

    const index = getNearestIndex(
        latest.steps.map((s) => new Date(s)),
        now,
    )

    return getEnsembleStats(latest).median[index] ?? null
}

// A slotted total belongs to the slot the time is in, not to the nearest slot start, which in a slot's second half
// is the next one.
const getMedianInSlot = (latest: LatestResponse, slotStart: Date) => {
    const index = latest.steps.findIndex((step) => new Date(step).getTime() === slotStart.getTime())

    return index < 0 ? null : (getEnsembleStats(latest).median[index] ?? null)
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
    const timeZone = city.timezone ?? 'UTC'

    const temp = toSlots(data.temp, timeZone, Variable.Temp)
    const wind = data.wind ? toSlots(data.wind, timeZone, Variable.Wind) : null
    const precip = data.precip ? toSlots(data.precip, timeZone, Variable.Precip) : null
    const cloud = data.cloud ? toSlots(data.cloud, timeZone, Variable.Cloud) : null
    const from = getSlotStart(now, timeZone)
    const next24 = getNext24(temp, from)
    const today = getDashboardStats(temp, Variable.Temp, timeZone, now).disagreement[0]
    const tempNow = getMedianAt(temp, now)
    const tempLater = getMedianAt(temp, new Date(now.getTime() + TREND_HOURS * HOUR_MS))
    const condition = cloud
        ? getWeatherCondition({
              cloud: getMedianAt(cloud, now),
              precip: precip ? getMedianInSlot(precip, from) : null,
              temp: tempNow,
          })
        : null

    return {
        city,
        fetchedAt: data.temp.fetchedAt,
        temp: tempNow,
        tempMin: getMin(next24),
        tempMax: getMax(next24),
        label: today?.label ?? null,
        labelDay: today?.day ?? null,
        wind: wind ? getMedianAt(wind, now) : null,
        precipTotal: precip ? getTotal(getNext24(precip, from)) : null,
        condition,
        trend: getTemperatureTrend(tempNow, tempLater),
        current: data.current ?? null,
    }
}

// The widget fetches on its own every 3 hours, so the run the app holds (possibly restored from a day-old cache) may be
// older than what the widget already shows. A model saved for another city (a widget reconfigured offline) is
// always replaced.
export const isNewerRun = (saved: Pick<WidgetModel, 'city' | 'fetchedAt'> | null, slug: string, fetchedAt: string) =>
    !saved || saved.city.slug !== slug || new Date(fetchedAt) > new Date(saved.fetchedAt)

const isToday = (day: string | null | undefined, timeZone: string, now: Date) =>
    day === getLocalDateKey(now.toISOString(), timeZone)

// A widget keeps the model of its last successful refresh; once it is bound to another city, that model belongs to
// the old one and must not be drawn under the new name. Its agreement label speaks for today only: built after the
// day's last slot it is about tomorrow, and drawn offline the next day it is about yesterday.
export const getShownModel = (city: WidgetCity | null, model: WidgetModel | null, now: Date) => {
    if (!city || model?.city.slug !== city.slug) return null

    return isToday(model.labelDay, model.city.timezone ?? 'UTC', now) ? model : { ...model, label: null }
}

import { getNearestIndex } from '@fa/chart-core/spaghetti-geometry'
import { CurrentResponse, LatestResponse } from '@fa/shared/api'
import { HOUR_MS } from '@fa/shared/constants'
import { getEnsembleStats } from '@fa/shared/dashboard'
import { Coordinates } from '@fa/shared/geo'
import { Place } from '@fa/shared/places'
import { buildSlots, getChartStart, getSlotStart, toSlotLatest } from '@fa/shared/slots'
import { getTemperatureTrend, TemperatureTrend, TREND_HOURS } from '@fa/shared/temperature-trend'
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
    cloud: LatestResponse
    precip: LatestResponse
    current: CurrentResponse | null
}

// Numbers only: the widget formats them in the reader's language when it draws, so a model saved for offline use
// stays right.
export interface WidgetModel {
    city: WidgetCity
    // The medians' temperature now, shown while the current temperature is unknown.
    temp: number | null
    // The current slot's sky from the medians, and where the median temperature goes next.
    condition: WeatherCondition | null
    trend: TemperatureTrend | null
    // The temperature now, from a nearby station when there is one; the medians only set its trend.
    current: CurrentResponse | null
}

// The widget reads only the coming hours, so it slots the run's first three days, not the charts' ten.
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

export const buildWidgetModel = (city: WidgetCity, data: WidgetData, now: Date): WidgetModel => {
    const timeZone = city.timezone ?? 'UTC'

    const temp = toSlots(data.temp, timeZone, Variable.Temp)
    const cloud = toSlots(data.cloud, timeZone, Variable.Cloud)
    const precip = toSlots(data.precip, timeZone, Variable.Precip)
    const tempNow = getMedianAt(temp, now)
    const tempLater = getMedianAt(temp, new Date(now.getTime() + TREND_HOURS * HOUR_MS))
    const condition = getWeatherCondition({
        cloud: getMedianAt(cloud, now),
        precip: getMedianInSlot(precip, getSlotStart(now, timeZone)),
        temp: tempNow,
    })

    return {
        city,
        temp: tempNow,
        condition,
        trend: getTemperatureTrend(tempNow, tempLater),
        current: data.current,
    }
}

// A widget keeps the model of its last successful refresh; once it is bound to another city, that model belongs to
// the old one and must not be drawn under the new name.
export const getShownModel = (city: WidgetCity | null, model: WidgetModel | null) =>
    city && model?.city.slug === city.slug ? model : null

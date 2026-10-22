import { apiGet } from '@fa/api-client/api'
import { City, CurrentResponse, LatestResponse } from '@fa/shared/api'
import { Place, toPlace } from '@fa/shared/places'
import { Variable } from '@fa/shared/variables'
import { WidgetRepresentation } from 'react-native-android-widget'
import { settingsStore } from '../lib/settings'
import { renderForecastWidget } from './forecast-widget'
import { buildWidgetModel, getShownModel, WidgetCity, WidgetData, WidgetModel } from './widget-model'
import { CLOCK_WIDGET, MEDIUM_WIDGET } from './widget-names'
import { widgetBindings, widgetModels } from './widget-store'
import { getAppLocale, getTranslator } from './widget-translator'

const getLatest = (slug: string, variable: Variable) => apiGet<LatestResponse>(`/cities/${slug}/latest`, { variable })

const fetchMediumData = async (slug: string): Promise<WidgetData> => {
    const [temp, wind, precip] = await Promise.all([
        getLatest(slug, Variable.Temp),
        getLatest(slug, Variable.Wind),
        getLatest(slug, Variable.Precip),
    ])

    return { temp, wind, precip }
}

// Without a current temperature the widget shows the medians' value for now instead.
const getCurrent = (slug: string) =>
    apiGet<CurrentResponse>(`/cities/${slug}/current`).catch((error) => {
        console.warn(`The current temperature for ${slug} is unavailable: ${String(error)}`)

        return null
    })

const fetchClockData = async (slug: string): Promise<WidgetData> => {
    const [temp, cloud, precip, current] = await Promise.all([
        getLatest(slug, Variable.Temp),
        getLatest(slug, Variable.Cloud),
        getLatest(slug, Variable.Precip),
        getCurrent(slug),
    ])

    return { temp, cloud, precip, current }
}

// Only what the widget shows: the small one needs temperature alone, the clock one the sky's condition too.
const fetchWidgetData = async (city: WidgetCity, widgetName: string): Promise<WidgetData> => {
    switch (widgetName) {
        case MEDIUM_WIDGET:
            return fetchMediumData(city.slug)
        case CLOCK_WIDGET:
            return fetchClockData(city.slug)
        default:
            return { temp: await getLatest(city.slug, Variable.Temp) }
    }
}

export const toWidgetCity = (city: City): WidgetCity => ({
    ...toPlace(city),
    timezone: city.timezone,
    coordinates: { lat: city.lat, lon: city.lon },
})

export const saveWidgetModel = (widgetId: number, model: WidgetModel) =>
    widgetModels.set((models) => ({ ...models, [widgetId]: model }))

export const drawWidget = (
    widgetId: number,
    widgetName: string,
    city: WidgetCity | null,
    model: WidgetModel | null,
): WidgetRepresentation => {
    const locale = getAppLocale()
    const now = new Date()

    return renderForecastWidget({
        widgetId,
        widgetName,
        city,
        model: getShownModel(city, model, now),
        theme: settingsStore.get().theme,
        t: getTranslator(locale),
        locale,
        now,
    })
}

// A widget placed offline is bound to a place without a time zone or coordinates; the first refresh that reaches the
// server fills them in and keeps them.
const resolveWidgetCity = async (widgetId: number, bound: WidgetCity): Promise<WidgetCity> => {
    if (bound.timezone !== null && bound.coordinates) return bound

    const city = toWidgetCity(await apiGet<City>(`/cities/${bound.slug}`))

    widgetBindings.set((bindings) => ({ ...bindings, [widgetId]: city }))

    return city
}

// Fetches the bound city's latest run (the API serves it from the CDN unless a newer run is due) and draws it; on
// any failure the widget keeps its last numbers with their age.
export const refreshWidget = async (widgetId: number, widgetName: string): Promise<WidgetRepresentation> => {
    const bound = widgetBindings.get()[widgetId] ?? null

    if (!bound) return drawWidget(widgetId, widgetName, null, null)

    try {
        const city = await resolveWidgetCity(widgetId, bound)
        const data = await fetchWidgetData(city, widgetName)
        const model = buildWidgetModel(city, data, new Date())

        saveWidgetModel(widgetId, model)

        return drawWidget(widgetId, widgetName, city, model)
    } catch (error) {
        console.warn(`Widget ${widgetId} could not refresh ${bound.slug}: ${String(error)}`)

        return drawWidget(widgetId, widgetName, bound, widgetModels.get()[widgetId] ?? null)
    }
}

// A stored place has no time zone, which the widget needs for local days; the city record has it. Without the
// network the zone stays unknown until the widget's first refresh that reaches the server.
const getWidgetCity = async (place: Place): Promise<WidgetCity> => {
    try {
        return toWidgetCity(await apiGet<City>(`/cities/${place.slug}`))
    } catch {
        return { ...place, timezone: null }
    }
}

export const bindWidgetCity = async (widgetId: number, widgetName: string, place: Place) => {
    const city = await getWidgetCity(place)

    widgetBindings.set((bindings) => ({ ...bindings, [widgetId]: city }))

    return refreshWidget(widgetId, widgetName)
}

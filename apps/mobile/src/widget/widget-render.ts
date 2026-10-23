import { apiGet } from '@fa/api-client/api'
import { City, CurrentResponse, LatestResponse } from '@fa/shared/api'
import { Place, toPlace } from '@fa/shared/places'
import { Variable } from '@fa/shared/variables'
import { WidgetRepresentation } from 'react-native-android-widget'
import { renderForecastWidget } from './forecast-widget'
import { buildWidgetModel, getShownModel, WidgetCity, WidgetData, WidgetModel } from './widget-model'
import { widgetBindings, widgetModels } from './widget-store'
import { getAppLocale, getTranslator } from './widget-translator'

const getLatest = (slug: string, variable: Variable) => apiGet<LatestResponse>(`/cities/${slug}/latest`, { variable })

// Without a current temperature the widget shows the medians' value for now instead.
const getCurrent = (slug: string) =>
    apiGet<CurrentResponse>(`/cities/${slug}/current`).catch((error) => {
        console.warn(`The current temperature for ${slug} is unavailable: ${String(error)}`)

        return null
    })

const fetchWidgetData = async (slug: string): Promise<WidgetData> => {
    const [temp, cloud, precip, current] = await Promise.all([
        getLatest(slug, Variable.Temp),
        getLatest(slug, Variable.Cloud),
        getLatest(slug, Variable.Precip),
        getCurrent(slug),
    ])

    return { temp, cloud, precip, current }
}

const toWidgetCity = (city: City): WidgetCity => ({
    ...toPlace(city),
    timezone: city.timezone,
    coordinates: { lat: city.lat, lon: city.lon },
})

const saveWidgetModel = (widgetId: number, model: WidgetModel) =>
    widgetModels.set((models) => ({ ...models, [widgetId]: model }))

export const drawWidget = (
    widgetId: number,
    city: WidgetCity | null,
    model: WidgetModel | null,
): WidgetRepresentation => {
    const locale = getAppLocale()

    return renderForecastWidget({
        widgetId,
        city,
        model: getShownModel(city, model),
        t: getTranslator(locale),
        locale,
        now: new Date(),
    })
}

export const drawSaved = (widgetId: number) =>
    drawWidget(widgetId, widgetBindings.get()[widgetId] ?? null, widgetModels.get()[widgetId] ?? null)

// A widget placed offline is bound to a place without a time zone or coordinates; the first refresh that reaches the
// server fills them in and keeps them.
const resolveWidgetCity = async (widgetId: number, bound: WidgetCity): Promise<WidgetCity> => {
    if (bound.timezone !== null && bound.coordinates) return bound

    const city = toWidgetCity(await apiGet<City>(`/cities/${bound.slug}`))

    widgetBindings.set((bindings) => ({ ...bindings, [widgetId]: city }))

    return city
}

// Fetches the bound city's latest run (the API serves it from the CDN unless a newer run is due) and its current
// temperature, and draws them; on any failure the widget keeps its last numbers.
export const refreshWidget = async (widgetId: number): Promise<WidgetRepresentation> => {
    const bound = widgetBindings.get()[widgetId] ?? null

    if (!bound) return drawWidget(widgetId, null, null)

    try {
        const city = await resolveWidgetCity(widgetId, bound)
        const model = buildWidgetModel(city, await fetchWidgetData(city.slug), new Date())

        saveWidgetModel(widgetId, model)

        return drawWidget(widgetId, city, model)
    } catch (error) {
        console.warn(`Widget ${widgetId} could not refresh ${bound.slug}: ${String(error)}`)

        return drawSaved(widgetId)
    }
}

// A stored place has no time zone, which the widget needs for local slots; the city record has it. Without the
// network the zone stays unknown until the widget's first refresh that reaches the server.
const getWidgetCity = async (place: Place): Promise<WidgetCity> => {
    try {
        return toWidgetCity(await apiGet<City>(`/cities/${place.slug}`))
    } catch {
        return { ...place, timezone: null }
    }
}

export const bindWidgetCity = async (widgetId: number, place: Place) => {
    const city = await getWidgetCity(place)

    widgetBindings.set((bindings) => ({ ...bindings, [widgetId]: city }))

    return refreshWidget(widgetId)
}

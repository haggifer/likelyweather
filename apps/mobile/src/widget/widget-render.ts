import { apiGet } from '@fa/api-client/api'
import { City, LatestResponse } from '@fa/shared/api'
import { toPlace } from '@fa/shared/places'
import { Variable } from '@fa/shared/variables'
import { WidgetRepresentation } from 'react-native-android-widget'
import { settingsStore } from '../lib/settings'
import { renderForecastWidget } from './forecast-widget'
import { buildWidgetModel, WidgetCity, WidgetData, WidgetModel } from './widget-model'
import { MEDIUM_WIDGET } from './widget-names'
import { widgetBindings, widgetModels } from './widget-store'
import { getAppLocale, getTranslator } from './widget-translator'

const getLatest = (slug: string, variable: Variable) => apiGet<LatestResponse>(`/cities/${slug}/latest`, { variable })

// Only what the widget's size shows: the small one needs temperature alone.
const fetchWidgetData = async (city: WidgetCity, widgetName: string): Promise<WidgetData> => {
    if (widgetName !== MEDIUM_WIDGET) return { temp: await getLatest(city.slug, Variable.Temp) }

    const [temp, wind, precip] = await Promise.all([
        getLatest(city.slug, Variable.Temp),
        getLatest(city.slug, Variable.Wind),
        getLatest(city.slug, Variable.Precip),
    ])

    return { temp, wind, precip }
}

export const toWidgetCity = (city: City): WidgetCity => ({ ...toPlace(city), timezone: city.timezone })

export const saveWidgetModel = (widgetId: number, model: WidgetModel) =>
    widgetModels.set((models) => ({ ...models, [widgetId]: model }))

export const drawWidget = (
    widgetName: string,
    city: WidgetCity | null,
    model: WidgetModel | null,
): WidgetRepresentation => {
    const locale = getAppLocale()

    return renderForecastWidget({
        widgetName,
        city,
        model,
        theme: settingsStore.get().theme,
        t: getTranslator(locale),
        locale,
        now: new Date(),
    })
}

// A widget placed offline is bound to a place without a time zone; the first refresh that reaches the server fills
// it in and keeps it.
const resolveWidgetCity = async (widgetId: number, bound: WidgetCity): Promise<WidgetCity> => {
    if (bound.timezone !== null) return bound

    const city = toWidgetCity(await apiGet<City>(`/cities/${bound.slug}`))

    widgetBindings.set((bindings) => ({ ...bindings, [widgetId]: city }))

    return city
}

// Fetches the bound city's latest run (the API serves it from the CDN unless a newer run is due) and draws it; on
// any failure the widget keeps its last numbers with their age.
export const refreshWidget = async (widgetId: number, widgetName: string): Promise<WidgetRepresentation> => {
    const bound = widgetBindings.get()[widgetId] ?? null

    if (!bound) return drawWidget(widgetName, null, null)

    try {
        const city = await resolveWidgetCity(widgetId, bound)
        const data = await fetchWidgetData(city, widgetName)
        const model = buildWidgetModel(city, data, new Date())

        saveWidgetModel(widgetId, model)

        return drawWidget(widgetName, city, model)
    } catch (error) {
        console.warn(`Widget ${widgetId} could not refresh ${bound.slug}: ${String(error)}`)

        return drawWidget(widgetName, bound, widgetModels.get()[widgetId] ?? null)
    }
}

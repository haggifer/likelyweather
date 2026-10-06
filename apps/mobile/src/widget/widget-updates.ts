import { City, LatestResponse } from '@fa/shared/api'
import { Variable } from '@fa/shared/variables'
import { Platform } from 'react-native'
import { requestWidgetUpdate } from 'react-native-android-widget'
import { buildWidgetModel } from './widget-model'
import { WIDGET_NAMES } from './widget-names'
import { drawWidget, saveWidgetModel, toWidgetCity } from './widget-render'
import { widgetBindings, widgetModels } from './widget-store'

// When the app loads a city, every widget bound to it redraws from that data without a fetch of its own; the others
// redraw from their saved numbers, which also applies a changed language or theme.
export const updateWidgetsForCity = async (city: City, hourly: Record<Variable, LatestResponse>) => {
    if (Platform.OS !== 'android') return

    const data = { temp: hourly[Variable.Temp], wind: hourly[Variable.Wind], precip: hourly[Variable.Precip] }

    await Promise.all(
        WIDGET_NAMES.map((widgetName) =>
            requestWidgetUpdate({
                widgetName,
                renderWidget: ({ widgetId }) => {
                    const bound = widgetBindings.get()[widgetId] ?? null

                    if (bound?.slug !== city.slug)
                        return drawWidget(widgetName, bound, widgetModels.get()[widgetId] ?? null)

                    const fresh = toWidgetCity(city)
                    const model = buildWidgetModel(fresh, data, new Date())

                    widgetBindings.set((bindings) => ({ ...bindings, [widgetId]: fresh }))
                    saveWidgetModel(widgetId, model)

                    return drawWidget(widgetName, fresh, model)
                },
            }).catch((error) => console.warn(`Widget update failed: ${String(error)}`)),
        ),
    )
}

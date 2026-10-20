import { OverviewHourly } from '@fa/chart-core/overview-stats'
import { City } from '@fa/shared/api'
import { Place } from '@fa/shared/places'
import { Variable } from '@fa/shared/variables'
import { Platform } from 'react-native'
import { getWidgetInfo, requestWidgetUpdate, requestWidgetUpdateById } from 'react-native-android-widget'
import { buildWidgetModel, isNewerRun, WidgetData } from './widget-model'
import { WIDGET_NAMES } from './widget-names'
import { bindWidgetCity, drawWidget, saveWidgetModel, toWidgetCity } from './widget-render'
import { widgetBindings, widgetModels } from './widget-store'

export interface PlacedWidget {
    widgetId: number
    widgetName: string
}

// The widget draws temperature, wind and precipitation; a reader who hides one of their panels leaves the app without
// that run, and the widget then waits for its own 3-hourly update rather than saving a partial model.
const getWidgetData = (hourly: OverviewHourly): Required<WidgetData> | null => {
    const temp = hourly[Variable.Temp]
    const wind = hourly[Variable.Wind]
    const precip = hourly[Variable.Precip]

    return temp && wind && precip ? { temp, wind, precip } : null
}

// When the app loads a city, every widget bound to it redraws from that data without a fetch of its own, unless the
// widget already shows a newer run; the others redraw from their saved numbers, which also applies a changed
// language or theme.
export const updateWidgetsForCity = async (city: City, hourly: OverviewHourly) => {
    const data = getWidgetData(hourly)

    if (Platform.OS !== 'android' || !data) return

    await Promise.all(
        WIDGET_NAMES.map((widgetName) =>
            requestWidgetUpdate({
                widgetName,
                renderWidget: ({ widgetId }) => {
                    const bound = widgetBindings.get()[widgetId] ?? null
                    const saved = widgetModels.get()[widgetId] ?? null

                    if (bound?.slug !== city.slug) return drawWidget(widgetId, widgetName, bound, saved)

                    const fresh = toWidgetCity(city)

                    widgetBindings.set((bindings) => ({ ...bindings, [widgetId]: fresh }))

                    if (!isNewerRun(saved, city.slug, data.temp.fetchedAt)) {
                        return drawWidget(widgetId, widgetName, fresh, saved)
                    }

                    const model = buildWidgetModel(fresh, data, new Date())

                    saveWidgetModel(widgetId, model)

                    return drawWidget(widgetId, widgetName, fresh, model)
                },
            }).catch((error) => console.warn(`Widget update failed: ${String(error)}`)),
        ),
    )
}

// Every placed widget draws again from its saved numbers, so a language or theme picked in Settings shows at once
// rather than at the widget's next update.
export const redrawWidgets = async () => {
    if (Platform.OS !== 'android') return

    await Promise.all(
        WIDGET_NAMES.map((widgetName) =>
            requestWidgetUpdate({
                widgetName,
                renderWidget: ({ widgetId }) =>
                    drawWidget(
                        widgetId,
                        widgetName,
                        widgetBindings.get()[widgetId] ?? null,
                        widgetModels.get()[widgetId] ?? null,
                    ),
            }).catch((error) => console.warn(`Widget redraw failed: ${String(error)}`)),
        ),
    )
}

// The widgets on the home screen now, as the launcher reports them; a binding can outlive a widget whose removal the
// app never heard about.
export const getPlacedWidgets = async (): Promise<PlacedWidget[]> => {
    if (Platform.OS !== 'android') return []

    const lists = await Promise.all(
        WIDGET_NAMES.map(async (widgetName) =>
            (await getWidgetInfo(widgetName)).map(({ widgetId }) => ({ widgetId, widgetName })),
        ),
    )

    return lists.flat()
}

export const changeWidgetCity = async (widgetId: number, place: Place) => {
    const widget = (await getPlacedWidgets()).find((w) => w.widgetId === widgetId)

    if (!widget) return

    const representation = await bindWidgetCity(widgetId, widget.widgetName, place)

    await requestWidgetUpdateById({ widgetName: widget.widgetName, widgetId, renderWidget: () => representation })
}

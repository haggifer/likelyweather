import { City } from '@fa/shared/api'
import { Place } from '@fa/shared/places'
import { Platform } from 'react-native'
import { getWidgetInfo, requestWidgetUpdate, requestWidgetUpdateById } from 'react-native-android-widget'
import { WIDGET_NAME } from './widget-names'
import { bindWidgetCity, drawSaved, refreshWidget } from './widget-render'
import { widgetBindings } from './widget-store'

// When the app loads a city, every widget bound to it fetches its current temperature and sky again; the others
// redraw from their saved numbers.
export const updateWidgetsForCity = async (city: City) => {
    if (Platform.OS !== 'android') return

    await requestWidgetUpdate({
        widgetName: WIDGET_NAME,
        renderWidget: ({ widgetId }) =>
            widgetBindings.get()[widgetId]?.slug === city.slug ? refreshWidget(widgetId) : drawSaved(widgetId),
    }).catch((error) => console.warn(`Widget update failed: ${String(error)}`))
}

// Every placed widget draws again from its saved numbers, so a language picked in Settings shows at once rather than
// at the widget's next update.
export const redrawWidgets = async () => {
    if (Platform.OS !== 'android') return

    await requestWidgetUpdate({
        widgetName: WIDGET_NAME,
        renderWidget: ({ widgetId }) => drawSaved(widgetId),
    }).catch((error) => console.warn(`Widget redraw failed: ${String(error)}`))
}

// The ids of the widgets on the home screen now, as the launcher reports them; a binding can outlive a widget whose
// removal the app never heard about.
export const getPlacedWidgetIds = async (): Promise<number[]> => {
    if (Platform.OS !== 'android') return []

    return (await getWidgetInfo(WIDGET_NAME)).map(({ widgetId }) => widgetId)
}

export const changeWidgetCity = async (widgetId: number, place: Place) => {
    if (!(await getPlacedWidgetIds()).includes(widgetId)) return

    const representation = await bindWidgetCity(widgetId, place)

    await requestWidgetUpdateById({ widgetName: WIDGET_NAME, widgetId, renderWidget: () => representation })
}

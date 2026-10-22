import { WidgetTaskHandler } from 'react-native-android-widget'
import { refreshWidget } from './widget-render'
import { forgetWidget } from './widget-store'

// Runs headless, without the app open: on placement, on resize and on Android's update period (app.json), 30 minutes,
// the shortest Android allows, for the current temperature.
export const widgetTaskHandler: WidgetTaskHandler = async ({ widgetInfo, widgetAction, renderWidget }) => {
    switch (widgetAction) {
        case 'WIDGET_ADDED':
        case 'WIDGET_UPDATE':
        case 'WIDGET_RESIZED': {
            const widget = await refreshWidget(widgetInfo.widgetId)

            renderWidget(widget)
            break
        }
        case 'WIDGET_DELETED':
            forgetWidget(widgetInfo.widgetId)
            break
        default:
            break
    }
}

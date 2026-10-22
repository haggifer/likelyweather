import { WidgetTaskHandler } from 'react-native-android-widget'
import { refreshWidget } from './widget-render'
import { forgetWidget } from './widget-store'

// Runs headless, without the app open: on placement, on resize and on Android's update period (app.json): 3 hours, the
// server's refresh age, and 30 minutes, Android's shortest, for the clock widget's current temperature.
export const widgetTaskHandler: WidgetTaskHandler = async ({ widgetInfo, widgetAction, renderWidget }) => {
    switch (widgetAction) {
        case 'WIDGET_ADDED':
        case 'WIDGET_UPDATE':
        case 'WIDGET_RESIZED': {
            const widget = await refreshWidget(widgetInfo.widgetId, widgetInfo.widgetName)

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

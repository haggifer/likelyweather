import { WidgetTaskHandler } from 'react-native-android-widget'
import { drawSaved, refreshWidget } from './widget-render'
import { forgetWidget } from './widget-store'

// Runs headless, without the app open: on placement and on Android's update period (app.json), 30 minutes, the
// shortest Android allows, for the current temperature.
export const widgetTaskHandler: WidgetTaskHandler = async ({ widgetInfo, widgetAction, renderWidget }) => {
    switch (widgetAction) {
        case 'WIDGET_ADDED':
        case 'WIDGET_UPDATE': {
            const widget = await refreshWidget(widgetInfo.widgetId)

            renderWidget(widget)
            break
        }
        // A resize changes no number, so it redraws the saved ones rather than asking the network (and the quota).
        case 'WIDGET_RESIZED':
            renderWidget(drawSaved(widgetInfo.widgetId))
            break
        case 'WIDGET_DELETED':
            forgetWidget(widgetInfo.widgetId)
            break
        default:
            break
    }
}

// organize-imports-ignore
// The Intl polyfills must run before any module that formats with Intl, and the API client must be configured before
// the widget's background task or a screen calls it, so both load first.
import './src/i18n/polyfills'
import './src/lib/api-setup'
import { registerWidgetConfigurationScreen, registerWidgetTaskHandler } from 'react-native-android-widget'
import { widgetTaskHandler } from './src/widget/widget-task-handler'
import { WidgetConfigurationScreen } from './src/widget/WidgetConfigurationScreen'
import 'expo-router/entry'

registerWidgetTaskHandler(widgetTaskHandler)
registerWidgetConfigurationScreen(WidgetConfigurationScreen)

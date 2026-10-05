// organize-imports-ignore
// The app's entry: the Intl polyfills must run before any module that formats with Intl, so they load first.
import './src/i18n/polyfills'
import 'expo-router/entry'

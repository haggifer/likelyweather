import { Locale } from '@fa/shared/api'
import { getLocales } from 'expo-localization'
import { createTranslator } from 'use-intl'
import { CATALOGS } from '../lib/catalogs'
import { resolveLocale, settingsStore } from '../lib/settings'

// The language the app's Settings hold, read outside React for the widget's background task.
export const getAppLocale = () => resolveLocale(settingsStore.get().language, getLocales()[0]?.languageCode)

export const getTranslator = (locale: Locale) => createTranslator({ locale, messages: CATALOGS[locale] })

export type Translator = ReturnType<typeof getTranslator>

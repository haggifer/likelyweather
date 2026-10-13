import { DEFAULT_LOCALE, Locale, LOCALES } from '@fa/shared/api'
import { DEFAULT_OVERVIEW_PANELS, normalizeOverviewPanels, OverviewPanels } from '@fa/shared/overview-panels'
import { createStoredValue } from './stored-value'

export type LanguageSetting = Locale | 'system'
export type ThemeSetting = 'system' | 'light' | 'dark'

export interface Settings {
    language: LanguageSetting
    theme: ThemeSetting
    overviewPanels: OverviewPanels
}

const DEFAULT_SETTINGS: Settings = { language: 'system', theme: 'system', overviewPanels: DEFAULT_OVERVIEW_PANELS }
export const THEME_SETTINGS: ThemeSetting[] = ['system', 'light', 'dark']

const isLanguage = (value: unknown): value is LanguageSetting => value === 'system' || LOCALES.includes(value as Locale)

const parseSettings = (raw: string | null): Settings => {
    try {
        const stored = JSON.parse(raw ?? 'null')

        return {
            language: isLanguage(stored?.language) ? stored.language : DEFAULT_SETTINGS.language,
            theme: THEME_SETTINGS.includes(stored?.theme) ? stored.theme : DEFAULT_SETTINGS.theme,
            overviewPanels: normalizeOverviewPanels(stored?.overviewPanels),
        }
    } catch {
        return DEFAULT_SETTINGS
    }
}

export const settingsStore = createStoredValue('fa.settings', parseSettings)

export const toLocale = (languageCode: string | null | undefined): Locale => {
    const code = languageCode?.toLowerCase()

    return LOCALES.find((locale) => locale === code) ?? DEFAULT_LOCALE
}

// "System" follows the device's first language when the app has a catalog for it, English otherwise.
export const resolveLocale = (language: LanguageSetting, deviceLanguage: string | null | undefined) =>
    language === 'system' ? toLocale(deviceLanguage) : language

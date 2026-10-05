import { DEFAULT_LOCALE, Locale, LOCALES } from '@fa/shared/api'

export const toLocale = (languageCode: string | null | undefined): Locale => {
    const code = languageCode?.toLowerCase()

    return LOCALES.find((locale) => locale === code) ?? DEFAULT_LOCALE
}

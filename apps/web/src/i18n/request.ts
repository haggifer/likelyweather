import { LOCALE_COOKIE } from '@/i18n/locale-cookie'
import { loadMessages } from '@fa/messages/load'
import { DEFAULT_LOCALE, Locale, LOCALES } from '@fa/shared/api'
import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

// The locale lives in a cookie rather than the URL: next-intl runs without i18n routing, so the language switch sets
// NEXT_LOCALE and refreshes.
export default getRequestConfig(async () => {
    const store = await cookies()
    const requested = store.get(LOCALE_COOKIE)?.value as Locale | undefined
    const locale = requested && LOCALES.includes(requested) ? requested : DEFAULT_LOCALE
    const messages = await loadMessages(locale)

    return { locale, timeZone: 'UTC', messages }
})

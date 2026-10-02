import { LOCALE_COOKIE } from '@/i18n/locale-cookie'
import { DEFAULT_LOCALE, Locale, LOCALES } from '@fa/shared/api'
import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

// Locale lives in a cookie rather than the URL in the prototype (see docs/DECISIONS.md).
export default getRequestConfig(async () => {
    const store = await cookies()
    const requested = store.get(LOCALE_COOKIE)?.value as Locale | undefined
    const locale = requested && LOCALES.includes(requested) ? requested : DEFAULT_LOCALE
    const { default: messages } = await import(`../../messages/${locale}.json`)

    return { locale, timeZone: 'UTC', messages }
})

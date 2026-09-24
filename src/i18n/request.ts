import { Locale, LOCALES } from '@/shared/api'
import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

export const LOCALE_COOKIE = 'NEXT_LOCALE'
const DEFAULT_LOCALE: Locale = 'en'

// Locale lives in a cookie rather than the URL in the prototype (see docs/DECISIONS.md).
export default getRequestConfig(async () => {
    const store = await cookies()
    const requested = store.get(LOCALE_COOKIE)?.value as Locale | undefined
    const locale = requested && LOCALES.includes(requested) ? requested : DEFAULT_LOCALE

    return {
        locale,
        timeZone: 'UTC',
        messages: (await import(`../../messages/${locale}.json`)).default,
    }
})

import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE_S } from '@/i18n/locale-cookie'
import { Locale, LOCALES } from '@fa/shared/api'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const LANG_PARAM = 'lang'

const isLocale = (value: string | null): value is Locale => LOCALES.includes(value as Locale)

// API_ORIGIN is read per request (next.config rewrites are fixed at build time), so one build serves any environment.
// On AWS CloudFront routes /api/* to the API before requests reach Next.js.
const forwardToApi = (request: NextRequest) => {
    const origin = process.env.API_ORIGIN ?? 'http://localhost:4000'

    return NextResponse.rewrite(new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, origin))
}

// The mobile app opens the legal pages in the browser, whose language cookie is not the app's, so its links name the
// app's language (`?lang=uk`). The cookie is set as the language menu would set it, and the page reloads without the
// parameter, so the address stays shareable.
const applyLanguage = (request: NextRequest) => {
    const lang = request.nextUrl.searchParams.get(LANG_PARAM)
    const target = request.nextUrl.clone()
    target.searchParams.delete(LANG_PARAM)

    const response = NextResponse.redirect(target)

    if (isLocale(lang)) {
        response.cookies.set(LOCALE_COOKIE, lang, { path: '/', maxAge: LOCALE_COOKIE_MAX_AGE_S, sameSite: 'lax' })
    }

    return response
}

export function proxy(request: NextRequest) {
    return request.nextUrl.pathname.startsWith('/api/') ? forwardToApi(request) : applyLanguage(request)
}

// Next.js reads the matcher statically, so the parameter name is spelled out here.
export const config = {
    matcher: ['/api/:path*', { source: '/((?!api/|_next/).*)', has: [{ type: 'query', key: 'lang' }] }],
}

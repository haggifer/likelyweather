import { CityShell } from '@/components/city/CityShell'
import { getCountryName } from '@fa/shared/format'
import type { Metadata } from 'next'
import { getLocale } from 'next-intl/server'

// "new-york-us-5128581" → "New York, United States". The slug carries the name and the country code, so the page
// title needs no request to the API (the web server may not be able to reach it, see DECISIONS P35).
const toTitle = (slug: string, locale: string) => {
    const match = /^(.+)-([a-z]{2})-\d+$/.exec(slug)

    if (!match) return slug

    const [, name, countryCode] = match
    const cityName = name
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')

    return `${cityName}, ${getCountryName(countryCode, countryCode.toUpperCase(), locale)}`
}

export const generateMetadata = async ({ params }: LayoutProps<'/city/[slug]'>): Promise<Metadata> => {
    const { slug } = await params
    const locale = await getLocale()

    return { title: toTitle(slug, locale) }
}

export default async function CityLayout({ children, params }: LayoutProps<'/city/[slug]'>) {
    const { slug } = await params

    return <CityShell slug={slug}>{children}</CityShell>
}

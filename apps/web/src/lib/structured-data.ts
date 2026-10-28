import { SITE_NAME, SITE_ORIGIN } from '@fa/shared/site'

interface WebPageOptions {
    title: string
    description: string
    path: string
    locale: string
    about?: Record<string, unknown>
}

interface CityPlaceOptions {
    name: string
    country: string
}

const WEBSITE = { '@type': 'WebSite', name: SITE_NAME, url: SITE_ORIGIN }

export const getSiteStructuredData = (description: string, locale: string) => ({
    '@context': 'https://schema.org',
    '@graph': [
        { ...WEBSITE, description, inLanguage: locale },
        {
            '@type': 'WebApplication',
            name: SITE_NAME,
            url: SITE_ORIGIN,
            description,
            applicationCategory: 'WeatherApplication',
            operatingSystem: 'Any',
            isAccessibleForFree: true,
            offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD' },
        },
    ],
})

export const getWebPageStructuredData = ({ title, description, path, locale, about }: WebPageOptions) => ({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url: `${SITE_ORIGIN}${path}`,
    inLanguage: locale,
    isPartOf: WEBSITE,
    ...(about && { about }),
})

export const getCityPlace = ({ name, country }: CityPlaceOptions) => ({
    '@type': 'City',
    name,
    containedInPlace: { '@type': 'Country', name: country },
})

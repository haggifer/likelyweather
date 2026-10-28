import { getCountryName } from '@fa/shared/format'

interface SlugPlace {
    name: string
    country: string
}

const SLUG_PATTERN = /^(.+)-([a-z]{2})-\d+$/

const toTitleCase = (words: string) =>
    words
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')

// "new-york-us-5128581" → New York, United States. The slug carries the name and the country code, so a page's
// metadata and share image need no request to the API: on Lambda the web function cannot call the IAM-protected API
// URL.
export const getSlugPlace = (slug: string, locale: string): SlugPlace | null => {
    const match = SLUG_PATTERN.exec(slug)

    if (!match) return null

    const [, name, countryCode] = match

    return { name: toTitleCase(name), country: getCountryName(countryCode, countryCode.toUpperCase(), locale) }
}

export const getSlugTitle = (slug: string, locale: string) => {
    const place = getSlugPlace(slug, locale)

    return place ? `${place.name}, ${place.country}` : slug
}

import { getCountryName } from '@fa/shared/format'

export interface SlugTitle {
    name: string
    region: string
    countryCode: string | null
}

const SLUG_PATTERN = /^(.+)-([a-z]{2})-\d+$/

const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1)

// "new-york-us-5128581" → New York, United States: the web's page title rule (`app/city/[slug]/layout.tsx`, web-only),
// so the City screen can name the place while the city itself is loading, missing or failing.
export const getSlugTitle = (slug: string, locale: string): SlugTitle => {
    const match = SLUG_PATTERN.exec(slug)

    if (!match) return { name: slug, region: '', countryCode: null }

    const [, name, countryCode] = match

    return {
        name: name.split('-').map(capitalize).join(' '),
        region: getCountryName(countryCode, countryCode.toUpperCase(), locale),
        countryCode,
    }
}

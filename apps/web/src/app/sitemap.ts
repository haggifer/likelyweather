import { SEEDS, slugify } from '@fa/shared/seeds'
import { SITE_ORIGIN } from '@fa/shared/site'
import type { MetadataRoute } from 'next'

// Any city can be opened, but only the seed cities are known without the API, which the web function cannot call on
// Lambda; a crawler reaches the rest through links.
const CITY_PAGES = SEEDS.map((seed) => `/city/${slugify(seed.name, seed.countryCode, seed.id)}`)

const toEntry = (path: string, changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']) => ({
    url: `${SITE_ORIGIN}${path}`,
    changeFrequency,
})

export default function sitemap(): MetadataRoute.Sitemap {
    return [
        toEntry('/', 'hourly'),
        ...CITY_PAGES.map((path) => toEntry(path, 'hourly')),
        toEntry('/archive', 'daily'),
        toEntry('/methodology', 'monthly'),
        toEntry('/privacy', 'yearly'),
        toEntry('/terms', 'yearly'),
    ]
}

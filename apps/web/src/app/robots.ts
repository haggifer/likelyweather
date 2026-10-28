import { SITE_ORIGIN } from '@fa/shared/site'
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: { userAgent: '*', allow: '/', disallow: '/api/' },
        sitemap: `${SITE_ORIGIN}/sitemap.xml`,
    }
}

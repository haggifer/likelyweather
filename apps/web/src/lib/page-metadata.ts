import en from '@fa/messages/catalogs/en.json'
import { Locale } from '@fa/shared/api'
import { SITE_NAME } from '@fa/shared/site'
import type { Metadata } from 'next'

interface PageMetadataOptions {
    title: string
    description: string
    path: string
    locale: string
}

export const SHARE_IMAGE_SIZE = { width: 1200, height: 630 }

// The root's `opengraph-image`, in English like the image itself.
const SITE_IMAGE = { url: '/opengraph-image', ...SHARE_IMAGE_SIZE, type: 'image/png', alt: en.seo.imageAlt }

const OPEN_GRAPH_LOCALES: Record<Locale, string> = {
    [Locale.En]: 'en_US',
    [Locale.Es]: 'es_ES',
    [Locale.De]: 'de_DE',
    [Locale.Fr]: 'fr_FR',
    [Locale.Ru]: 'ru_RU',
    [Locale.Uk]: 'uk_UA',
}

// Next.js merges metadata shallowly, so a page that sets `openGraph` replaces the layout's, and with it an
// `opengraph-image` file of a segment above: every page builds all of it here, the root's image included. A segment's
// own `opengraph-image` file still wins over it.
export const getPageMetadata = ({ title, description, path, locale }: PageMetadataOptions): Metadata => ({
    description,
    alternates: { canonical: path },
    openGraph: {
        type: 'website',
        siteName: SITE_NAME,
        title,
        description,
        url: path,
        locale: OPEN_GRAPH_LOCALES[locale as Locale],
        images: [SITE_IMAGE],
    },
    twitter: { card: 'summary_large_image', title, description, images: [SITE_IMAGE] },
})

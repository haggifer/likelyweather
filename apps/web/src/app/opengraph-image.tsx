import { SHARE_IMAGE_SIZE } from '@/lib/page-metadata'
import { getShareImage } from '@/lib/share-image'
import en from '@fa/messages/catalogs/en.json'

// Crawlers fetch a share image without the language cookie, so it is drawn once, at build time, in English.
export const alt = en.seo.imageAlt
export const size = SHARE_IMAGE_SIZE
export const contentType = 'image/png'

export default function Image() {
    return getShareImage({ title: en.app.tagline, subtitle: 'likelyweather.com' })
}

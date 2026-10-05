import { Locale } from '@fa/shared/api'
import type en from '../catalogs/en.json'

export type Messages = typeof en

// Static imports per locale, so bundlers (Next.js, Metro) see every catalog and load only the requested one.
const LOADERS: Record<Locale, () => Promise<{ default: Messages }>> = {
    [Locale.Uk]: () => import('../catalogs/uk.json'),
    [Locale.En]: () => import('../catalogs/en.json'),
    [Locale.Es]: () => import('../catalogs/es.json'),
    [Locale.De]: () => import('../catalogs/de.json'),
    [Locale.Fr]: () => import('../catalogs/fr.json'),
}

export const loadMessages = async (locale: Locale) => {
    const catalog = await LOADERS[locale]()

    return catalog.default
}

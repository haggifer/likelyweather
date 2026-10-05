import { Locale, LOCALES } from '@fa/shared/api'
import { loadMessages } from './load'

describe('loadMessages', () => {
    it('loads every locale with the English sections', async () => {
        const en = await loadMessages(Locale.En)

        for (const locale of LOCALES) {
            const messages = await loadMessages(locale)

            expect(Object.keys(messages)).toEqual(Object.keys(en))
        }
    })

    it('returns the catalog of the requested locale', async () => {
        const uk = await loadMessages(Locale.Uk)
        const en = await loadMessages(Locale.En)

        expect(uk.nav.compare).not.toBe(en.nav.compare)
    })
})

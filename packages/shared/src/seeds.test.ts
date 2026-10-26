import { Locale, LOCALES } from './api'
import { SEEDS } from './seeds'

const LOCAL_LOCALES = LOCALES.filter((locale) => locale !== Locale.En)

describe('SEEDS', () => {
    it('names every starter city and its region in every UI language', () => {
        for (const seed of SEEDS) {
            expect(Object.keys(seed.nameLocal).sort()).toEqual([...LOCAL_LOCALES].sort())
            expect(Object.keys(seed.admin1Local).sort()).toEqual([...LOCAL_LOCALES].sort())
        }
    })
})

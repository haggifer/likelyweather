import { LANGUAGE_NAMES } from './languages'
import { LOCALES } from './locale'

describe('LANGUAGE_NAMES', () => {
    it('names every locale, each in a different name', () => {
        expect(Object.keys(LANGUAGE_NAMES).sort()).toEqual([...LOCALES].sort())
        expect(new Set(Object.values(LANGUAGE_NAMES)).size).toBe(LOCALES.length)
    })
})

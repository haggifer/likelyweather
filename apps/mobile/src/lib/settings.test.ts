import { Locale } from '@fa/shared/api'
import { resolveLocale, toLocale } from './settings'

describe('toLocale', () => {
    it('maps a supported device language to its locale', () => {
        expect(toLocale('uk')).toBe(Locale.Uk)
        expect(toLocale('DE')).toBe(Locale.De)
    })

    it('falls back to English for anything else', () => {
        expect(toLocale('pl')).toBe(Locale.En)
        expect(toLocale(null)).toBe(Locale.En)
    })
})

describe('resolveLocale', () => {
    it('follows the device when the setting is "system", and the setting otherwise', () => {
        expect(resolveLocale('system', 'fr')).toBe(Locale.Fr)
        expect(resolveLocale('system', 'pl')).toBe(Locale.En)
        expect(resolveLocale(Locale.Uk, 'fr')).toBe(Locale.Uk)
    })
})

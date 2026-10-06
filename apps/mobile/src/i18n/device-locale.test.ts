import { Locale } from '@fa/shared/api'
import { toLocale } from './device-locale'

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

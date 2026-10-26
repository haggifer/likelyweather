import { getCityRegion } from './city-region'
import { getCityLabel } from './format'

const KYIV = {
    name: 'Kyiv',
    nameLocal: { uk: 'Київ', ru: 'Киев' },
    admin1: 'Kyiv City',
    admin1Local: { uk: 'Місто Київ', ru: 'Киев' },
    country: 'Ukraine',
    countryCode: 'UA',
}

describe('city names in the reader language', () => {
    it('names the region in the reader language', () => {
        expect(getCityRegion(KYIV, 'uk')).toBe('Місто Київ, Україна')
        expect(getCityLabel(KYIV, 'ru')).toBe('Киев, Киев, Украина')
    })

    it('falls back to the English region for a language the record lacks', () => {
        expect(getCityRegion(KYIV, 'en')).toBe('Kyiv City, Ukraine')
        expect(getCityRegion({ ...KYIV, admin1Local: undefined }, 'uk')).toBe('Kyiv City, Україна')
    })
})

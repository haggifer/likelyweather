import { City } from './api'
import { getLocateFarValues, toLocateResult } from './locate'

const KHARKIV: City = {
    id: 706483,
    slug: 'kharkiv-ua-706483',
    name: 'Kharkiv',
    nameLocal: { uk: 'Харків' },
    country: 'Ukraine',
    countryCode: 'UA',
    lat: 49.98,
    lon: 36.25,
    timezone: 'Europe/Kyiv',
    population: 1_430_885,
}

describe('toLocateResult', () => {
    it('opens the nearest stored city up to 50 km away, as a place', () => {
        expect(toLocateResult({ city: KHARKIV, distanceKm: 50 })).toEqual({
            kind: 'open',
            place: {
                id: KHARKIV.id,
                slug: KHARKIV.slug,
                name: KHARKIV.name,
                nameLocal: KHARKIV.nameLocal,
                admin1: undefined,
                country: KHARKIV.country,
                countryCode: KHARKIV.countryCode,
            },
        })
    })

    it('offers it with its distance when it is farther', () => {
        expect(toLocateResult({ city: KHARKIV, distanceKm: 50.5 })).toEqual({
            kind: 'far',
            city: KHARKIV,
            distanceKm: 50.5,
        })
    })
})

describe('getLocateFarValues', () => {
    it('names the city in the reader language and rounds the distance', () => {
        expect(getLocateFarValues(KHARKIV, 1234.6, 'uk')).toEqual({
            name: 'Харків',
            km: new Intl.NumberFormat('uk').format(1235),
        })
        expect(getLocateFarValues(KHARKIV, 1234.4, 'en')).toEqual({ name: 'Kharkiv', km: '1,234' })
    })
})

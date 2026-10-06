import { getDistanceKm, roundCoordinates } from './geo'

const KHARKIV = { lat: 49.9808, lon: 36.2527 }
const KYIV = { lat: 50.4547, lon: 30.5238 }

describe('getDistanceKm', () => {
    it('measures Kharkiv to Kyiv at about 410 km', () => {
        expect(getDistanceKm(KHARKIV, KYIV)).toBeCloseTo(410, -1)
        expect(getDistanceKm(KYIV, KHARKIV)).toBeCloseTo(getDistanceKm(KHARKIV, KYIV), 6)
    })

    it('crosses the antimeridian the short way', () => {
        expect(getDistanceKm({ lat: 0, lon: 179.5 }, { lat: 0, lon: -179.5 })).toBeCloseTo(111, 0)
    })

    it('is zero between identical points', () => {
        expect(getDistanceKm(KHARKIV, KHARKIV)).toBe(0)
    })
})

describe('roundCoordinates', () => {
    it('keeps two decimals, about a kilometre', () => {
        expect(roundCoordinates({ lat: 49.98081, lon: 36.25272 })).toEqual({ lat: 49.98, lon: 36.25 })
        expect(roundCoordinates({ lat: -33.8688, lon: 179.999 })).toEqual({ lat: -33.87, lon: 180 })
    })
})

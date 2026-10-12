import { getApparentTemperature, getApparentTemperatures } from './apparent-temperature'

// Inputs and \`apparent_temperature\` as Open-Meteo returned them for ECMWF IFS on 2026-10-12 (Kharkiv, Cairo); Open-Meteo
// rounds both to 0.1, so the match is to within 0.1 °C.
const OPEN_METEO = [
    { temp: 12.1, humidity: 85, wind: 2.51, radiation: 0, expected: 10.7 },
    { temp: 20, humidity: 58, wind: 2.78, radiation: 500, expected: 19 },
    { temp: 26.6, humidity: 38, wind: 1.87, radiation: 757, expected: 27.3 },
    { temp: 28.1, humidity: 33, wind: 1.75, radiation: 806, expected: 28.9 },
]

describe('getApparentTemperature', () => {
    it.each(OPEN_METEO)('matches Open-Meteo at $temp °C, $humidity %, $wind m/s, $radiation W/m²', (row) => {
        expect(
            Math.abs(getApparentTemperature(row.temp, row.humidity, row.wind, row.radiation)! - row.expected),
        ).toBeLessThan(0.1)
    })

    it('reads a missing radiation as shade, where sunshine adds nothing', () => {
        expect(getApparentTemperature(26.6, 38, 1.87)).toBeLessThan(getApparentTemperature(26.6, 38, 1.87, 757)!)
        expect(getApparentTemperature(20, 58, 2.78)).toBe(getApparentTemperature(20, 58, 2.78, 500))
    })

    it('has no value without temperature, humidity or wind', () => {
        expect(getApparentTemperature(null, 50, 2)).toBeNull()
        expect(getApparentTemperature(10, null, 2)).toBeNull()
        expect(getApparentTemperature(10, 50, null)).toBeNull()
    })
})

describe('getApparentTemperatures', () => {
    it('computes step by step and leaves gaps where an input is missing', () => {
        expect(getApparentTemperatures([12.1, 10], [85, null], [2.51, 2])).toEqual([10.7, null])
    })
})

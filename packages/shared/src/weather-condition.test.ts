import { getWeatherCondition, isDaylight, WeatherCondition } from './weather-condition'

const KYIV = { lat: 50.45, lon: 30.52 }
const TROMSO = { lat: 69.65, lon: 18.96 }
const EQUATOR = { lat: 0, lon: 0 }

describe('getWeatherCondition', () => {
    it.each([
        [0, WeatherCondition.Clear],
        [31.2, WeatherCondition.Clear],
        [31.25, WeatherCondition.PartlyCloudy],
        [68.7, WeatherCondition.PartlyCloudy],
        [68.75, WeatherCondition.Cloudy],
        [100, WeatherCondition.Cloudy],
    ])('reads %s %% cloud cover as %s', (cloud, expected) => {
        expect(getWeatherCondition({ cloud, precip: 0, temp: 10 })).toBe(expected)
    })

    it('shows precipitation from 0.3 mm in the 3-hour slot, whatever the sky', () => {
        expect(getWeatherCondition({ cloud: 100, precip: 0.29, temp: 10 })).toBe(WeatherCondition.Cloudy)
        expect(getWeatherCondition({ cloud: 100, precip: 0.3, temp: 10 })).toBe(WeatherCondition.Rain)
        expect(getWeatherCondition({ cloud: 10, precip: 2, temp: 10 })).toBe(WeatherCondition.Rain)
        expect(getWeatherCondition({ cloud: null, precip: 2, temp: 10 })).toBe(WeatherCondition.Rain)
    })

    it('reads precipitation as snow at 1 °C and below', () => {
        expect(getWeatherCondition({ cloud: 100, precip: 1, temp: 1 })).toBe(WeatherCondition.Snow)
        expect(getWeatherCondition({ cloud: 100, precip: 1, temp: -12 })).toBe(WeatherCondition.Snow)
        expect(getWeatherCondition({ cloud: 100, precip: 1, temp: 1.1 })).toBe(WeatherCondition.Rain)
    })

    it('decides from the sky alone when the precipitation total is missing', () => {
        expect(getWeatherCondition({ cloud: 50, precip: null, temp: null })).toBe(WeatherCondition.PartlyCloudy)
    })

    it('has no condition without the cloud cover, or without the temperature when it precipitates', () => {
        expect(getWeatherCondition({ cloud: null, precip: 0, temp: 10 })).toBeNull()
        expect(getWeatherCondition({ cloud: null, precip: null, temp: null })).toBeNull()
        expect(getWeatherCondition({ cloud: 100, precip: 1, temp: null })).toBeNull()
    })
})

describe('isDaylight', () => {
    it('follows the day in Kyiv in October', () => {
        expect(isDaylight(KYIV, new Date('2026-10-15T12:00:00+03:00'))).toBe(true)
        expect(isDaylight(KYIV, new Date('2026-10-15T00:00:00+03:00'))).toBe(false)
    })

    // Kyiv's sunrise on the June solstice is at 4:47 and its sunset at 21:12, Kyiv summer time.
    it('turns at sunrise and sunset in Kyiv', () => {
        expect(isDaylight(KYIV, new Date('2026-06-21T04:42:00+03:00'))).toBe(false)
        expect(isDaylight(KYIV, new Date('2026-06-21T04:52:00+03:00'))).toBe(true)
        expect(isDaylight(KYIV, new Date('2026-06-21T21:07:00+03:00'))).toBe(true)
        expect(isDaylight(KYIV, new Date('2026-06-21T21:17:00+03:00'))).toBe(false)
    })

    it('keeps the polar night and the midnight sun in Tromsø', () => {
        expect(isDaylight(TROMSO, new Date('2026-12-21T12:00:00+01:00'))).toBe(false)
        expect(isDaylight(TROMSO, new Date('2026-06-21T00:00:00+02:00'))).toBe(true)
    })

    it('follows the day on the equator', () => {
        expect(isDaylight(EQUATOR, new Date('2026-03-20T12:00:00Z'))).toBe(true)
        expect(isDaylight(EQUATOR, new Date('2026-03-20T00:00:00Z'))).toBe(false)
    })
})

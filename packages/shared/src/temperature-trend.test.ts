import { getTemperatureTrend, TemperatureTrend } from './temperature-trend'

describe('getTemperatureTrend', () => {
    it('reads a change below 1 °C either way as steady', () => {
        expect(getTemperatureTrend(10, 10.9)).toBe(TemperatureTrend.Steady)
        expect(getTemperatureTrend(10, 9.1)).toBe(TemperatureTrend.Steady)
    })

    it('rises from 1 °C and rises fast from 3 °C', () => {
        expect(getTemperatureTrend(10, 11)).toBe(TemperatureTrend.Rising)
        expect(getTemperatureTrend(10, 12.9)).toBe(TemperatureTrend.Rising)
        expect(getTemperatureTrend(10, 13)).toBe(TemperatureTrend.RisingFast)
    })

    it('falls from 1 °C and falls fast from 3 °C', () => {
        expect(getTemperatureTrend(-2, -3)).toBe(TemperatureTrend.Falling)
        expect(getTemperatureTrend(-2, -4.9)).toBe(TemperatureTrend.Falling)
        expect(getTemperatureTrend(-2, -5)).toBe(TemperatureTrend.FallingFast)
    })

    it('has no trend without both temperatures', () => {
        expect(getTemperatureTrend(null, 10)).toBeNull()
        expect(getTemperatureTrend(10, null)).toBeNull()
    })
})

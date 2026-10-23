export enum TemperatureTrend {
    FallingFast = 'fallingFast',
    Falling = 'falling',
    Steady = 'steady',
    Rising = 'rising',
    RisingFast = 'risingFast',
}

// Over the trend's 3 hours, a change below 1 °C is within what neighbouring runs disagree by, so it reads as steady;
// 3 °C or more is the kind of swing a front or the morning sun brings.
const STEADY_BELOW = 1
const FAST_FROM = 3
export const TREND_HOURS = 3

// `later` is the temperature TREND_HOURS after `now`.
export const getTemperatureTrend = (now: number | null, later: number | null) => {
    if (now === null || later === null) return null

    const change = later - now

    if (Math.abs(change) < STEADY_BELOW) return TemperatureTrend.Steady

    if (change > 0) return change >= FAST_FROM ? TemperatureTrend.RisingFast : TemperatureTrend.Rising

    return -change >= FAST_FROM ? TemperatureTrend.FallingFast : TemperatureTrend.Falling
}

import { TemperatureTrend } from '@fa/shared/temperature-trend'
import { WeatherCondition } from '@fa/shared/weather-condition'

// Drawn for the clock widget, over the wallpaper like the stock weather widget's icons: a yellow sun or pale moon, a
// white cloud with a soft shadow, blue rain and white snow. The shadow is a second, offset shape because the widget's
// SVG renderer does not run filters.
const SUN = '#ffc83d'
const MOON = '#f6e7a1'
const CLOUD = '#ffffff'
const SHADOW = 'rgba(0,0,0,0.22)'
const RAIN = '#5ab0ff'

const CLOUD_PATH = 'M15 38H34A7 7 0 0 0 35.2 24.1A10 10 0 0 0 16 21.5A8.5 8.5 0 0 0 15 38Z'

const getCloud = (dy = 0) =>
    `<g transform="translate(0 ${dy})"><path d="${CLOUD_PATH}" transform="translate(0 1.5)" fill="${SHADOW}"/>` +
    `<path d="${CLOUD_PATH}" fill="${CLOUD}"/></g>`

const getSun = (cx: number, cy: number, r: number) => {
    const rays = Array.from({ length: 8 }, (_, i) => {
        const angle = (i * Math.PI) / 4
        const [from, to] = [r + 3, r + 7]

        return (
            `<line x1="${cx + from * Math.cos(angle)}" y1="${cy + from * Math.sin(angle)}" ` +
            `x2="${cx + to * Math.cos(angle)}" y2="${cy + to * Math.sin(angle)}"/>`
        )
    }).join('')

    return `<g stroke="${SUN}" stroke-width="2.5" stroke-linecap="round">${rays}</g><circle cx="${cx}" cy="${cy}" r="${r}" fill="${SUN}"/>`
}

const getMoon = (cx: number, cy: number, r: number) =>
    `<path d="M${cx + r * 0.3} ${cy - r}A${r} ${r} 0 1 0 ${cx + r} ${cy + r * 0.45}A${r * 0.8} ${r * 0.8} 0 1 1 ${cx + r * 0.3} ${cy - r}Z" fill="${MOON}"/>`

const getDrops = (color: string, isSnow: boolean) =>
    [17, 24, 31]
        .map((x) =>
            isSnow
                ? `<circle cx="${x}" cy="41" r="2.2" fill="${color}"/>`
                : `<line x1="${x + 1}" y1="38" x2="${x - 1}" y2="44" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/>`,
        )
        .join('')

// How far right each drawing reaches in the 48-unit box: the icon is shifted by the rest, so its right edge lines up
// with the right-aligned text under it.
const CLOUD_RIGHT = 41.6
const getSunRight = (cx: number, r: number) => cx + r + 7 + 1.25
const getMoonRight = (cx: number, r: number) => cx + r

const getShapes = (condition: WeatherCondition, isDay: boolean): [string, number] => {
    switch (condition) {
        case WeatherCondition.Clear:
            return isDay ? [getSun(24, 24, 9), getSunRight(24, 9)] : [getMoon(24, 24, 12), getMoonRight(24, 12)]
        case WeatherCondition.PartlyCloudy:
            return isDay
                ? [getSun(31, 17, 7) + getCloud(2), getSunRight(31, 7)]
                : [getMoon(31, 17, 9) + getCloud(2), Math.max(getMoonRight(31, 9), CLOUD_RIGHT)]
        case WeatherCondition.Cloudy:
            return [getCloud(), CLOUD_RIGHT]
        case WeatherCondition.Rain:
            return [getCloud(-6) + getDrops(RAIN, false), CLOUD_RIGHT]
        case WeatherCondition.Snow:
            return [getCloud(-6) + getDrops(CLOUD, true), CLOUD_RIGHT]
    }
}

export const getWeatherIcon = (condition: WeatherCondition, isDay: boolean) => {
    const [shapes, right] = getShapes(condition, isDay)

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><g transform="translate(${48 - right} 0)">${shapes}</g></svg>`
}

const RISING = '#4ade80'
const FALLING = '#ff6b6b'
const STEADY = '#ffffff'
const TREND_SHADOW = 'rgba(0,0,0,0.3)'

const ARROW_HEADS: Record<'up' | 'down', (offset: number) => string> = {
    up: (offset) => `M${10 - offset} ${5 + offset}H${19 - offset}V${14 + offset}`,
    down: (offset) => `M${10 - offset} ${19 - offset}H${19 - offset}V${10 - offset}`,
}

const getArrow = (direction: 'up' | 'down', isFast: boolean) => {
    const shaft = direction === 'up' ? 'M5 19L19 5' : 'M5 5L19 19'
    const heads = isFast ? [ARROW_HEADS[direction](0), ARROW_HEADS[direction](5)] : [ARROW_HEADS[direction](0)]

    return [shaft, ...heads].join('')
}

const getTrendPath = (trend: TemperatureTrend) => {
    switch (trend) {
        case TemperatureTrend.Steady:
            return 'M4 14C6.5 9 9.5 9 12 12S17.5 15 20 10'
        case TemperatureTrend.Rising:
        case TemperatureTrend.RisingFast:
            return getArrow('up', trend === TemperatureTrend.RisingFast)
        case TemperatureTrend.Falling:
        case TemperatureTrend.FallingFast:
            return getArrow('down', trend === TemperatureTrend.FallingFast)
    }
}

const getTrendColor = (trend: TemperatureTrend) => {
    if (trend === TemperatureTrend.Steady) return STEADY

    return trend === TemperatureTrend.Rising || trend === TemperatureTrend.RisingFast ? RISING : FALLING
}

export const getTrendIcon = (trend: TemperatureTrend) => {
    const path = getTrendPath(trend)
    const stroke = 'fill="none" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"'

    // Every glyph ends about 20.5 units in, with its round cap; the shift puts that at the box's right edge.
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g transform="translate(3.5 0)">' +
        `<path d="${path}" transform="translate(0 1)" stroke="${TREND_SHADOW}" ${stroke}/>` +
        `<path d="${path}" stroke="${getTrendColor(trend)}" ${stroke}/></g></svg>`
    )
}

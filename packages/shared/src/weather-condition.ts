import { Coordinates, toRadians } from './geo'

export enum WeatherCondition {
    Clear = 'clear',
    PartlyCloudy = 'partlyCloudy',
    Cloudy = 'cloudy',
    Rain = 'rain',
    Snow = 'snow',
}

export interface WeatherReading {
    // Cloud cover, %.
    cloud: number | null
    // Summed over the 3-hour slot, mm.
    precip: number | null
    temp: number | null
}

// The US National Weather Service's sky-cover terms, in oktas (eighths of the sky, the unit WMO and METAR report):
// up to 2 is (mostly) clear, 3 to 5 partly cloudy, 6 to 8 (mostly) cloudy. A percentage is read as the nearest okta.
const OKTA_PERCENT = 100 / 8
const MAX_CLEAR_OKTAS = 2
const MAX_PARTLY_CLOUDY_OKTAS = 5
// 0.1 mm an hour on average: the smallest amount a WMO rain gauge reports (less is a trace), a little above the
// NWS's 0.01 in (0.25 mm) of measurable precipitation, so the drizzle models spread over dry hours shows no rain.
const MIN_PRECIP_MM = 0.3
// Rain and snow are equally likely at about 1 °C air temperature, the Northern Hemisphere mean found by Jennings et al.
// (2018, Nature Communications 9: 1148) over 29 years of station observations.
const MAX_SNOW_TEMP = 1
// The sun's centre is 0.833° below the horizon at sunrise and sunset: refraction plus the sun's apparent radius.
const SUNRISE_ELEVATION = -0.833
const DAY_MS = 24 * 60 * 60 * 1000

const getSkyCondition = (cloud: number) => {
    const oktas = Math.round(cloud / OKTA_PERCENT)

    if (oktas <= MAX_CLEAR_OKTAS) return WeatherCondition.Clear

    return oktas <= MAX_PARTLY_CLOUDY_OKTAS ? WeatherCondition.PartlyCloudy : WeatherCondition.Cloudy
}

const getPrecipCondition = (temp: number) => (temp <= MAX_SNOW_TEMP ? WeatherCondition.Snow : WeatherCondition.Rain)

// A missing precipitation total says nothing about rain, so the sky alone decides; a missing temperature leaves
// rain and snow apart undecided.
export const getWeatherCondition = ({ cloud, precip, temp }: WeatherReading) => {
    if (precip !== null && precip >= MIN_PRECIP_MM) return temp === null ? null : getPrecipCondition(temp)

    return cloud === null ? null : getSkyCondition(cloud)
}

// NOAA's fractional year: the angle of the Earth's orbit from 1 January, centred on noon.
const getFractionalYear = (date: Date) => {
    const year = date.getUTCFullYear()
    const yearStart = Date.UTC(year, 0, 1)
    const yearDays = (Date.UTC(year + 1, 0, 1) - yearStart) / DAY_MS

    return ((2 * Math.PI) / yearDays) * ((date.getTime() - yearStart) / DAY_MS - 0.5)
}

const getEquationOfTimeMinutes = (g: number) =>
    229.18 *
    (0.000075 +
        0.001868 * Math.cos(g) -
        0.032077 * Math.sin(g) -
        0.014615 * Math.cos(2 * g) -
        0.040849 * Math.sin(2 * g))

const getDeclination = (g: number) =>
    0.006918 -
    0.399912 * Math.cos(g) +
    0.070257 * Math.sin(g) -
    0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) -
    0.002697 * Math.cos(3 * g) +
    0.00148 * Math.sin(3 * g)

// NOAA's general solar position formulas (gml.noaa.gov/grad/solcalc/solareqns.PDF), good to about a minute of
// sunrise time. Comparing the sun's elevation itself, not sunrise and sunset times, keeps polar day and night right.
export const isDaylight = ({ lat, lon }: Coordinates, date: Date) => {
    const g = getFractionalYear(date)
    const utcMinutes = (date.getTime() % DAY_MS) / 60_000
    const solarMinutes = utcMinutes + getEquationOfTimeMinutes(g) + 4 * lon
    const hourAngle = toRadians(solarMinutes / 4 - 180)
    const declination = getDeclination(g)
    const latitude = toRadians(lat)
    const sinElevation =
        Math.sin(latitude) * Math.sin(declination) + Math.cos(latitude) * Math.cos(declination) * Math.cos(hourAngle)

    return sinElevation > Math.sin(toRadians(SUNRISE_ELEVATION))
}

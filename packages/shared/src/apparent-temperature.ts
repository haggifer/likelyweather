// Open-Meteo's own feels-like formula (Steadman's apparent temperature with the Australian Bureau of Meteorology's
// radiation term, `Meteorology.apparentTemperature` in open-meteo/open-meteo), so a model's feels-like here matches
// the \`apparent_temperature\` Open-Meteo would return for it. Wind is the 10 m speed in m/s, scaled to 2 m; without
// shortwave radiation (met.no's compact feed has none) the radiation term is zero, the value in the shade.
const WIND_2M_FACTOR = 0.75
const RADIATION_BASE = 550

const getVapourPressure = (temp: number, humidity: number) =>
    (humidity / 100) * 6.105 * Math.exp((17.27 * temp) / (237.7 + temp))

export const getApparentTemperature = (
    temp: number | null,
    humidity: number | null,
    wind: number | null,
    radiation: number | null = null,
) => {
    if (temp === null || humidity === null || wind === null) return null

    const wind2m = wind * WIND_2M_FACTOR
    const absorbed = Math.max(0, 0.1 * ((radiation ?? RADIATION_BASE) - RADIATION_BASE))
    const value =
        temp + 0.348 * getVapourPressure(temp, humidity) - 0.7 * wind2m + 0.7 * (absorbed / (wind2m + 10)) - 4.25

    return Math.round(value * 100) / 100
}

export const getApparentTemperatures = (
    temp: (number | null)[],
    humidity: (number | null)[],
    wind: (number | null)[],
    radiation?: (number | null)[],
) => temp.map((t, i) => getApparentTemperature(t, humidity[i] ?? null, wind[i] ?? null, radiation?.[i] ?? null))

import { Coordinates } from '@fa/shared/geo'
import { env } from '../env'
import { fetchJson } from './fetch-with-retry'

interface CurrentBody {
    current: { time: string; temperature_2m: number | null }
}

export interface ModelTemperature {
    time: Date
    temp: number
}

// Open-Meteo's best model for the place at the current quarter hour: native 15-minute models in North America and
// Central Europe, interpolated from hourly runs elsewhere. Times come back in GMT without an offset.
export const fetchModelTemperature = async ({ lat, lon }: Coordinates): Promise<ModelTemperature> => {
    const params = new URLSearchParams({
        latitude: lat.toFixed(4),
        longitude: lon.toFixed(4),
        current: 'temperature_2m',
        timezone: 'GMT',
    })
    const { current } = await fetchJson<CurrentBody>(`${env.OPEN_METEO_FORECAST_BASE}/v1/forecast?${params}`)

    if (current.temperature_2m === null) throw new Error('Open-Meteo has no current temperature here')

    return { time: new Date(`${current.time}:00Z`), temp: current.temperature_2m }
}

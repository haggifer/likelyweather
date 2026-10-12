// The order is the order of the dashboard's variable switch.
export enum Variable {
    Temp = 'temp',
    Feels = 'feels',
    Wind = 'wind',
    Gusts = 'gusts',
    Pressure = 'pressure',
    Precip = 'precip',
    Humidity = 'humidity',
    Cloud = 'cloud',
}

export interface ModelSeries {
    temp: (number | null)[]
    feels: (number | null)[]
    wind: (number | null)[]
    gusts: (number | null)[]
    windDir: (number | null)[]
    pressure: (number | null)[]
    precip: (number | null)[]
    humidity: (number | null)[]
    cloud: (number | null)[]
}

export type SeriesField = keyof ModelSeries

export type Aggregation = 'instant' | 'sum'

export interface DisagreementThresholds {
    agree: number
    split: number
}

export interface VariableInfo {
    id: Variable
    field: SeriesField
    unit: string
    decimals: number
    aggregation: Aggregation
    disagreement: DisagreementThresholds
    tickStep?: number
    tickSteps?: number[]
    // A bounded quantity (a percentage) keeps its whole range on the axis, so the charts of two places read alike.
    fixedDomain?: [number, number]
    isNonNegative?: boolean
}

export const VARIABLES: VariableInfo[] = [
    {
        id: Variable.Temp,
        field: 'temp',
        unit: '°C',
        decimals: 1,
        aggregation: 'instant',
        disagreement: { agree: 2, split: 4.5 },
        tickStep: 5,
    },
    {
        id: Variable.Feels,
        field: 'feels',
        unit: '°C',
        decimals: 1,
        aggregation: 'instant',
        disagreement: { agree: 2, split: 4.5 },
        tickStep: 5,
    },
    {
        id: Variable.Wind,
        field: 'wind',
        unit: 'm/s',
        decimals: 1,
        aggregation: 'instant',
        disagreement: { agree: 1.5, split: 4 },
        tickStep: 2,
        isNonNegative: true,
    },
    {
        id: Variable.Gusts,
        field: 'gusts',
        unit: 'm/s',
        decimals: 1,
        aggregation: 'instant',
        // Gusts run about half again as strong as the mean wind, and so do the models' differences.
        disagreement: { agree: 2.5, split: 6 },
        tickStep: 5,
        isNonNegative: true,
    },
    {
        id: Variable.Pressure,
        field: 'pressure',
        unit: 'hPa',
        decimals: 0,
        aggregation: 'instant',
        disagreement: { agree: 2.5, split: 6 },
    },
    {
        id: Variable.Precip,
        field: 'precip',
        unit: 'mm',
        decimals: 1,
        aggregation: 'sum',
        disagreement: { agree: 2, split: 8 },
        // Both sources report 0.1 mm amounts, so the finest readable step is 0.5 mm.
        tickSteps: [0.5, 1, 2, 5, 10, 20, 25, 50],
        isNonNegative: true,
    },
    {
        id: Variable.Humidity,
        field: 'humidity',
        unit: '%',
        decimals: 0,
        aggregation: 'instant',
        disagreement: { agree: 10, split: 25 },
        tickStep: 25,
        fixedDomain: [0, 100],
    },
    {
        id: Variable.Cloud,
        field: 'cloud',
        unit: '%',
        decimals: 0,
        aggregation: 'instant',
        disagreement: { agree: 20, split: 50 },
        tickStep: 25,
        fixedDomain: [0, 100],
    },
]

// What the overview can draw: its panels (`PanelVariable`), with feels-like and gusts as second lines on temperature
// and wind. Which panels show is the reader's choice (`overview-panels.ts`).
export const OVERVIEW_VARIABLES = [
    Variable.Temp,
    Variable.Feels,
    Variable.Wind,
    Variable.Gusts,
    Variable.Pressure,
    Variable.Precip,
    Variable.Humidity,
    Variable.Cloud,
] as const

export type OverviewVariable = (typeof OVERVIEW_VARIABLES)[number]

export const VARIABLE_BY_ID: Record<Variable, VariableInfo> = Object.fromEntries(
    VARIABLES.map((v) => [v.id, v]),
) as Record<Variable, VariableInfo>

// The series Open-Meteo returns as they are. Feels-like is not among them: it is computed from temperature, humidity,
// wind and shortwave radiation when a run is stored (`getApparentTemperature`), so every model, met.no included,
// gets the same formula.
export const SERIES_FIELDS: { field: SeriesField; openMeteoKey: string; aggregation: Aggregation }[] = [
    { field: 'temp', openMeteoKey: 'temperature_2m', aggregation: 'instant' },
    { field: 'wind', openMeteoKey: 'wind_speed_10m', aggregation: 'instant' },
    { field: 'gusts', openMeteoKey: 'wind_gusts_10m', aggregation: 'instant' },
    { field: 'windDir', openMeteoKey: 'wind_direction_10m', aggregation: 'instant' },
    { field: 'pressure', openMeteoKey: 'pressure_msl', aggregation: 'instant' },
    { field: 'precip', openMeteoKey: 'precipitation', aggregation: 'sum' },
    { field: 'humidity', openMeteoKey: 'relative_humidity_2m', aggregation: 'instant' },
    { field: 'cloud', openMeteoKey: 'cloud_cover', aggregation: 'instant' },
]

// Fetched only to compute feels-like; never stored.
export const RADIATION_KEY = 'shortwave_radiation'

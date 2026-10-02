export enum Variable {
    Temp = 'temp',
    Wind = 'wind',
    Pressure = 'pressure',
    Precip = 'precip',
}

export interface ModelSeries {
    temp: (number | null)[]
    wind: (number | null)[]
    windDir: (number | null)[]
    pressure: (number | null)[]
    pressureSfc: (number | null)[]
    precip: (number | null)[]
    rain: (number | null)[]
    snow: (number | null)[]
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
    openMeteoKey: string
    aggregation: Aggregation
    disagreement: DisagreementThresholds
    tickStep?: number
    tickSteps?: number[]
    isNonNegative?: boolean
}

export const VARIABLES: VariableInfo[] = [
    {
        id: Variable.Temp,
        field: 'temp',
        unit: '°C',
        decimals: 1,
        openMeteoKey: 'temperature_2m',
        aggregation: 'instant',
        disagreement: { agree: 2, split: 4.5 },
        tickStep: 5,
    },
    {
        id: Variable.Wind,
        field: 'wind',
        unit: 'm/s',
        decimals: 1,
        openMeteoKey: 'wind_speed_10m',
        aggregation: 'instant',
        disagreement: { agree: 1.5, split: 4 },
        tickStep: 2,
        isNonNegative: true,
    },
    {
        id: Variable.Pressure,
        field: 'pressure',
        unit: 'hPa',
        decimals: 0,
        openMeteoKey: 'pressure_msl',
        aggregation: 'instant',
        disagreement: { agree: 2.5, split: 6 },
    },
    {
        id: Variable.Precip,
        field: 'precip',
        unit: 'mm',
        decimals: 1,
        openMeteoKey: 'precipitation',
        aggregation: 'sum',
        disagreement: { agree: 2, split: 8 },
        // Both sources report 0.1 mm amounts, so the finest readable step is 0.5 mm.
        tickSteps: [0.5, 1, 2, 5, 10, 20, 25, 50],
        isNonNegative: true,
    },
]

export const VARIABLE_BY_ID: Record<Variable, VariableInfo> = Object.fromEntries(
    VARIABLES.map((v) => [v.id, v]),
) as Record<Variable, VariableInfo>

export const SERIES_FIELDS: { field: SeriesField; openMeteoKey: string; aggregation: Aggregation }[] = [
    { field: 'temp', openMeteoKey: 'temperature_2m', aggregation: 'instant' },
    { field: 'wind', openMeteoKey: 'wind_speed_10m', aggregation: 'instant' },
    { field: 'windDir', openMeteoKey: 'wind_direction_10m', aggregation: 'instant' },
    { field: 'pressure', openMeteoKey: 'pressure_msl', aggregation: 'instant' },
    { field: 'pressureSfc', openMeteoKey: 'surface_pressure', aggregation: 'instant' },
    { field: 'precip', openMeteoKey: 'precipitation', aggregation: 'sum' },
    { field: 'rain', openMeteoKey: 'rain', aggregation: 'sum' },
    { field: 'snow', openMeteoKey: 'snowfall', aggregation: 'sum' },
]

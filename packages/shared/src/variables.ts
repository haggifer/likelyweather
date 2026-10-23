// The order is the order of the details page's variable switch.
export enum Variable {
    Temp = 'temp',
    Feels = 'feels',
    Wind = 'wind',
    Gusts = 'gusts',
    Pressure = 'pressure',
    Precip = 'precip',
    Chance = 'chance',
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
    // A view the client computes from another variable's run rather than a stored series: the chance of rain from
    // precipitation. The API is never asked for it (`StoredVariableSchema`).
    source?: Variable
    field: SeriesField
    unit: string
    decimals: number
    aggregation: Aggregation
    // Null for a view whose models do not differ by an amount (the chance of rain): it has no disagreement card.
    disagreement: DisagreementThresholds | null
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
        // The share of the shown models above 0.2 mm in a slot (`computeChanceOfRain`), the overview's strip; like the
        // precipitation it comes from, it covers the 3 hours after its slot.
        id: Variable.Chance,
        source: Variable.Precip,
        field: 'precip',
        unit: '%',
        decimals: 0,
        aggregation: 'sum',
        disagreement: null,
        tickStep: 25,
        fixedDomain: [0, 100],
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

// On phones the dashboard's switch names a pair once, and the pair's own sub-tabs pick the actual value or its
// companion: feels-like under temperature, gusts under wind (author, 2026-10-14).
const VARIABLE_PAIRS: [Variable, Variable][] = [
    [Variable.Temp, Variable.Feels],
    [Variable.Wind, Variable.Gusts],
    [Variable.Precip, Variable.Chance],
]

export const getVariablePair = (variable: Variable) => VARIABLE_PAIRS.find((pair) => pair.includes(variable)) ?? null

// The phone switch's tab that holds a variable: the pair's first one, or the variable itself.
export const getVariableTab = (variable: Variable) => getVariablePair(variable)?.[0] ?? variable

export const PHONE_VARIABLES = VARIABLES.map((v) => v.id).filter((id) => getVariableTab(id) === id)

// The run a variable's chart is drawn from: its own, or its source's for a computed view.
export const getDataVariable = (variable: Variable) => VARIABLE_BY_ID[variable].source ?? variable

// The variable read beside this one on phones, "17.2 (15.0)": the other member of a pair of the same kind of value.
// Precipitation and its chance share a tab but not a unit, so neither is read with the other.
export const getCompanion = (variable: Variable) => {
    const other = getVariablePair(variable)?.find((v) => v !== variable) ?? null

    return other && getDataVariable(other) === other && getDataVariable(variable) === variable ? other : null
}

// The variables whose models differ by an amount, with their thresholds: the disagreement cards and the methodology.
export const DISAGREEMENT_VARIABLES = VARIABLES.flatMap(({ disagreement, ...info }) =>
    disagreement ? [{ ...info, disagreement }] : [],
)

// The variables the API stores and serves, one `/latest` request each.
export const STORED_VARIABLES = VARIABLES.filter((v) => !v.source).map((v) => v.id)

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

// Ingests CSVs written by the Python collector this project grew out of as origin IMPORT runs. Both of its header
// versions are read by column name: the current one (model, …, precip_mm, rain_mm, snowfall_cm) and the first one
// (source, model, …, wind_ms, no precipitation). Rows are 6-hourly; each stays at its own valid time on the hourly grid.
import { City, Run } from '@fa/shared/api'
import { ModelId, MODELS } from '@fa/shared/models'
import { floorToStep, toIsoMinute } from '@fa/shared/time'
import { ModelSeries, SeriesField } from '@fa/shared/variables'
import { countRows, getRunId } from './collector'
import { Snapshot, upsertRun, writeSnapshot } from './store'

export interface ParsedCsv {
    issueTime: string
    snapshots: Omit<Snapshot, 'runId' | 'origin' | 'fetchedAt'>[]
    skipped: string[]
}

type FieldColumns = Record<SeriesField, number | undefined>
type RowsByStep = Map<string, string[]>
type RowsByModel = Map<ModelId, RowsByStep>

const COLUMNS: Record<SeriesField, string[]> = {
    temp: ['temp_c'],
    wind: ['wind_speed_ms', 'wind_ms'],
    windDir: ['wind_dir_deg'],
    pressure: ['pressure_msl_hpa'],
    pressureSfc: ['surface_pressure_hpa'],
    precip: ['precip_mm'],
    rain: ['rain_mm'],
    snow: ['snowfall_cm'],
}
const FIELDS = Object.keys(COLUMNS) as SeriesField[]
const MODEL_IDS = new Set<string>(MODELS.map((m) => m.id))
// Requested coordinates are rounded to 2–4 decimals; tracked cities are matched within this distance in degrees.
const MATCH_DEGREES = 0.05

const toNumber = (text: string | undefined) => (text === undefined || text === '' ? null : Number(text))

// "forecast_20260909T130553Z.csv" → the fetch time, used when the file's issue_time column is empty.
const getFileTime = (fileName: string) => {
    const match = /(\d{8}T\d{6}Z)/.exec(fileName)

    if (!match) return null

    const [, stamp] = match

    return new Date(
        `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}T${stamp.slice(9, 11)}:${stamp.slice(11, 13)}:${stamp.slice(13, 15)}Z`,
    )
}

const addRow = (byCity: Map<number, RowsByModel>, cityId: number, model: ModelId, step: string, cells: string[]) => {
    const models = byCity.get(cityId) ?? new Map()
    const steps = models.get(model) ?? new Map()

    steps.set(step, cells)
    models.set(model, steps)
    byCity.set(cityId, models)
}

const toSeries = (rows: RowsByStep, steps: string[], fieldColumns: FieldColumns) =>
    Object.fromEntries(
        FIELDS.map((f) => {
            const i = fieldColumns[f]

            return [f, steps.map((step) => (i === undefined ? null : toNumber(rows.get(step)?.[i])))]
        }),
    ) as unknown as ModelSeries

const toSnapshot = (cityId: number, models: RowsByModel, issueTime: string, fieldColumns: FieldColumns) => {
    const steps = [...new Set([...models.values()].flatMap((s) => [...s.keys()]))].sort()
    const series = Object.fromEntries(
        [...models].map(([modelId, rows]) => [modelId, toSeries(rows, steps, fieldColumns)]),
    )

    return { cityId, issueTime, steps, models: series }
}

export const parseForecastCsv = (text: string, fileName: string, cities: City[]): ParsedCsv => {
    const [headerLine, ...lines] = text.trim().split(/\r?\n/)
    const header = headerLine.split(',')
    const getColumn = (names: string[]) => names.map((n) => header.indexOf(n)).find((i) => i >= 0)
    const at = {
        model: getColumn(['model'])!,
        lat: getColumn(['req_lat'])!,
        lon: getColumn(['req_lon'])!,
        issue: getColumn(['issue_time'])!,
        valid: getColumn(['valid_time'])!,
    }
    const fieldColumns = Object.fromEntries(FIELDS.map((f) => [f, getColumn(COLUMNS[f])])) as FieldColumns
    const skipped = new Set<string>()
    const byCity = new Map<number, RowsByModel>()
    let fetchedAt = getFileTime(fileName)

    for (const line of lines) {
        const cells = line.split(',')
        const model = cells[at.model]
        const lat = Number(cells[at.lat])
        const lon = Number(cells[at.lon])
        const city = cities.find((c) => Math.abs(c.lat - lat) < MATCH_DEGREES && Math.abs(c.lon - lon) < MATCH_DEGREES)

        if (cells[at.issue]) fetchedAt ??= new Date(cells[at.issue])

        if (!MODEL_IDS.has(model)) {
            skipped.add(`unknown model ${model}`)
            continue
        }

        if (!city) {
            skipped.add(`no tracked city at ${lat},${lon}`)
            continue
        }

        addRow(byCity, city.id, model as ModelId, toIsoMinute(new Date(cells[at.valid])), cells)
    }

    if (!fetchedAt) throw new Error(`${fileName}: no issue_time column value and no timestamp in the file name`)

    const issueTime = toIsoMinute(floorToStep(fetchedAt))
    const snapshots = [...byCity].map(([cityId, models]) => toSnapshot(cityId, models, issueTime, fieldColumns))

    return { issueTime, snapshots, skipped: [...skipped] }
}

// Stores a parsed CSV as one IMPORT run. Re-importing the same file replaces its rows.
export const importForecastCsv = async (parsed: ParsedCsv, fileName: string) => {
    const now = new Date().toISOString()
    const run: Run = {
        id: getRunId('IMPORT', parsed.issueTime),
        issueTime: parsed.issueTime,
        origin: 'IMPORT',
        cityId: null,
        startedAt: now,
        finishedAt: now,
        status: 'OK',
        rows: 0,
        citiesCount: parsed.snapshots.length,
        warnings: parsed.skipped.map((s) => `${fileName}: ${s}`),
        archivePath: null,
    }
    const rows = countRows(parsed.snapshots)

    await upsertRun({ ...run, rows })

    for (const snapshot of parsed.snapshots) {
        await writeSnapshot({ ...snapshot, runId: run.id, origin: 'IMPORT', fetchedAt: now })
    }

    return { ...run, rows }
}

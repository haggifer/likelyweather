import { SeriesGrid, Snapshot } from '@/server/store'
import { LatestResponse, Resolution, Series } from '@/shared/api'
import { MODELS } from '@/shared/models'
import { SeriesField, Variable, VARIABLE_BY_ID } from '@/shared/variables'

const EMPTY_GRID: SeriesGrid = { steps: [], models: {} }

const pickSeries = (grid: SeriesGrid, field: SeriesField): Series[] =>
    MODELS.filter((m) => grid.models[m.id]).map((m) => ({ modelId: m.id, values: grid.models[m.id]![field] }))

export const toLatestResponse = (
    snapshot: Snapshot,
    variable: Variable,
    resolution: Resolution = 'step',
): LatestResponse => {
    const grid = resolution === 'hourly' ? (snapshot.hourly ?? EMPTY_GRID) : snapshot

    return {
        issueTime: snapshot.issueTime,
        fetchedAt: snapshot.fetchedAt,
        origin: snapshot.origin,
        runId: snapshot.runId,
        steps: grid.steps,
        series: pickSeries(grid, VARIABLE_BY_ID[variable].field),
        directions: variable === Variable.Wind ? pickSeries(grid, 'windDir') : undefined,
    }
}

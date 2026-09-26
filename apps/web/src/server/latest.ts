import { SeriesGrid, Snapshot } from '@/server/store'
import { LatestResponse, Series } from '@fa/shared/api'
import { MODELS } from '@fa/shared/models'
import { SeriesField, Variable, VARIABLE_BY_ID } from '@fa/shared/variables'

const pickSeries = (grid: SeriesGrid, field: SeriesField): Series[] =>
    MODELS.filter((m) => grid.models[m.id]).map((m) => ({ modelId: m.id, values: grid.models[m.id]![field] }))

export const toLatestResponse = (snapshot: Snapshot, variable: Variable): LatestResponse => ({
    issueTime: snapshot.issueTime,
    fetchedAt: snapshot.fetchedAt,
    origin: snapshot.origin,
    runId: snapshot.runId,
    steps: snapshot.steps,
    series: pickSeries(snapshot, VARIABLE_BY_ID[variable].field),
    directions: variable === Variable.Wind ? pickSeries(snapshot, 'windDir') : undefined,
})

import { Snapshot } from '@/server/store'
import { LatestResponse, Series } from '@/shared/api'
import { MODELS } from '@/shared/models'
import { SeriesField, Variable, VARIABLE_BY_ID } from '@/shared/variables'

const pickSeries = (snapshot: Snapshot, field: SeriesField): Series[] =>
    MODELS.filter((m) => snapshot.models[m.id]).map((m) => ({ modelId: m.id, values: snapshot.models[m.id]![field] }))

export const toLatestResponse = (snapshot: Snapshot, variable: Variable): LatestResponse => ({
    issueTime: snapshot.issueTime,
    fetchedAt: snapshot.fetchedAt,
    origin: snapshot.origin,
    runId: snapshot.runId,
    steps: snapshot.steps,
    series: pickSeries(snapshot, VARIABLE_BY_ID[variable].field),
    directions: variable === Variable.Wind ? pickSeries(snapshot, 'windDir') : undefined,
})

import { LatestResponse, Series } from '@fa/shared/api'
import { MODELS } from '@fa/shared/models'
import { SeriesField, Variable, VARIABLE_BY_ID } from '@fa/shared/variables'
import { cached } from './cache'
import { getSnapshotGrid, SeriesGrid, SnapshotMeta } from './store'

const PAYLOAD_TTL_SECONDS = 300

const pickSeries = (grid: SeriesGrid, field: SeriesField): Series[] =>
    MODELS.filter((m) => grid.models[m.id]).map((m) => ({ modelId: m.id, values: grid.models[m.id]![field] }))

const getFields = (variable: Variable): SeriesField[] =>
    variable === Variable.Wind ? [VARIABLE_BY_ID[variable].field, 'windDir'] : [VARIABLE_BY_ID[variable].field]

// The run id is part of the key, so a scheduled run replacing a preview of the same issue time is never served
// from a stale entry and nothing needs invalidating.
export const getLatestPayload = (meta: SnapshotMeta, variable: Variable) =>
    cached(
        `latest:${meta.cityId}:${meta.runId}:${variable}`,
        PAYLOAD_TTL_SECONDS,
        async (): Promise<LatestResponse> => {
            const grid = await getSnapshotGrid(meta, getFields(variable))

            return {
                issueTime: meta.issueTime,
                fetchedAt: meta.fetchedAt,
                origin: meta.origin,
                runId: meta.runId,
                steps: grid.steps,
                series: pickSeries(grid, VARIABLE_BY_ID[variable].field),
                directions: variable === Variable.Wind ? pickSeries(grid, 'windDir') : undefined,
            }
        },
    )

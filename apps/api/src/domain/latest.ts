import { LatestResponse, Series } from '@fa/shared/api'
import { MODELS } from '@fa/shared/models'
import { compactIso } from '@fa/shared/time'
import { SeriesField, Variable, VARIABLE_BY_ID } from '@fa/shared/variables'
import { cached } from './cache'
import { getSnapshotGrid, SeriesGrid, SnapshotMeta } from './store'

const PAYLOAD_TTL_SECONDS = 300

// A model without a single value for the field (met.no has no gusts) is left out, so it is neither drawn nor counted.
const pickSeries = (grid: SeriesGrid, field: SeriesField): Series[] =>
    MODELS.filter((m) => grid.models[m.id]?.[field].some((v) => v !== null)).map((m) => ({
        modelId: m.id,
        values: grid.models[m.id]![field],
    }))

const getFields = (variable: Variable): SeriesField[] =>
    variable === Variable.Wind ? [VARIABLE_BY_ID[variable].field, 'windDir'] : [VARIABLE_BY_ID[variable].field]

// The run id repeats for every fetch inside one 6-hour step while a refresh happens at 3 hours, so the fetch time is
// part of the key: a newer fetch is never served from the previous one's entry, and nothing needs invalidating.
export const getLatestPayload = (meta: SnapshotMeta, variable: Variable) =>
    cached(
        `latest:${meta.cityId}:${meta.runId}:${compactIso(meta.fetchedAt)}:${variable}`,
        PAYLOAD_TTL_SECONDS,
        async (): Promise<LatestResponse> => {
            const grid = await getSnapshotGrid(meta, getFields(variable))

            return {
                issueTime: meta.issueTime,
                fetchedAt: meta.fetchedAt,
                runId: meta.runId,
                steps: grid.steps,
                series: pickSeries(grid, VARIABLE_BY_ID[variable].field),
                directions: variable === Variable.Wind ? pickSeries(grid, 'windDir') : undefined,
            }
        },
    )

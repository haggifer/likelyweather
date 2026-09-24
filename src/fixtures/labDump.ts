import dump from '@/fixtures/lab-dump.json'
import { City, EvolutionResponse, LatestResponse } from '@/shared/api'
import { Variable } from '@/shared/variables'

// Real API payloads captured by `pnpm lab:dump`. The Theme Lab gallery renders only this, never live queries.
export interface LabDump {
    capturedAt: string
    city: City
    latest: Record<Variable, LatestResponse>
    hourly: Record<Variable, LatestResponse>
    evolution: EvolutionResponse
}

export const LAB_DUMP = dump as unknown as LabDump

export const LAB_NOW = new Date(LAB_DUMP.capturedAt)

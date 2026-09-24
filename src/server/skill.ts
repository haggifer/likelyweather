import { LeadDaySeries, PreviousRunsData } from '@/server/sources/previousRuns'
import { ErrorSample, SkillCell, TruthMode } from '@/shared/api'
import { LEAD_BUCKETS, MIN_TRUTH_CONTRIBUTORS, PRECIP_HIT_MM } from '@/shared/constants'
import { median } from '@/shared/ensemble'
import { ModelId } from '@/shared/models'
import { Variable } from '@/shared/variables'
import { sortBy } from 'es-toolkit'

export interface ErrorRecord extends ErrorSample {
    day: string
    hit: boolean | null
}

export interface ErrorStats {
    n: number
    mae: number | null
    bias: number | null
    rmse: number | null
    hitRate: number | null
}

const WORST_COUNT = 10

const round = (value: number | null, digits = 3) =>
    value === null ? null : Math.round(value * 10 ** digits) / 10 ** digits

export const computeConsensusTruth = (data: PreviousRunsData) =>
    data.steps.map((_, i) => {
        const analyses = Object.values(data.models)
            .map((byDay) => byDay[0][i])
            .filter((v): v is number => v !== null)

        return analyses.length >= MIN_TRUTH_CONTRIBUTORS ? median(analyses) : null
    })

export const getTruth = (data: PreviousRunsData, mode: TruthMode, modelId: ModelId, consensus: (number | null)[]) =>
    mode === 'consensus' ? consensus : (data.models[modelId]?.[0] ?? data.steps.map(() => null))

export const collectErrors = (
    steps: string[],
    byDay: LeadDaySeries,
    leadDay: number,
    truth: (number | null)[],
    variable: Variable,
    now: Date,
): ErrorRecord[] => {
    const forecasts = byDay[leadDay] ?? []
    const records: ErrorRecord[] = []

    steps.forEach((validTime, i) => {
        const forecast = forecasts[i]
        const observed = truth[i]

        if (new Date(validTime) > now || forecast === null || forecast === undefined || observed === null) return

        records.push({
            validTime,
            day: validTime.slice(0, 10),
            forecast,
            truth: observed,
            error: forecast - observed,
            hit: variable === Variable.Precip ? forecast > PRECIP_HIT_MM === observed > PRECIP_HIT_MM : null,
        })
    })

    return records
}

export const summarizeErrors = (records: ErrorRecord[]): ErrorStats => {
    const n = records.length

    if (!n) return { n, mae: null, bias: null, rmse: null, hitRate: null }

    const hits = records.filter((r) => r.hit !== null)

    return {
        n,
        mae: round(records.reduce((sum, r) => sum + Math.abs(r.error), 0) / n),
        bias: round(records.reduce((sum, r) => sum + r.error, 0) / n),
        rmse: round(Math.sqrt(records.reduce((sum, r) => sum + r.error ** 2, 0) / n)),
        hitRate: hits.length ? round(hits.filter((r) => r.hit).length / hits.length) : null,
    }
}

export const getWorst = (records: ErrorRecord[]): ErrorSample[] =>
    sortBy(records, [(r) => -Math.abs(r.error)])
        .slice(0, WORST_COUNT)
        .map(({ validTime, forecast, truth, error }) => ({ validTime, forecast, truth, error: round(error)! }))

export const computeSkillCells = (
    data: PreviousRunsData,
    variable: Variable,
    mode: TruthMode,
    days: string[],
    now: Date,
): SkillCell[] => {
    const consensus = computeConsensusTruth(data)
    const cells: SkillCell[] = []

    for (const [modelId, byDay] of Object.entries(data.models) as [ModelId, LeadDaySeries][]) {
        const truth = getTruth(data, mode, modelId, consensus)

        LEAD_BUCKETS.forEach((leadBucket, i) => {
            const records = collectErrors(data.steps, byDay, i + 1, truth, variable, now)
            const stats = summarizeErrors(records)
            const spark = days.map((day) => summarizeErrors(records.filter((r) => r.day === day)).mae)

            cells.push({
                modelId,
                leadBucket,
                ...stats,
                hitRate: variable === Variable.Precip ? stats.hitRate : undefined,
                spark,
                worst: getWorst(records),
            })
        })
    }

    return cells
}

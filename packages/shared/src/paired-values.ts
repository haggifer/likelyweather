import { Series } from './api'
import { formatNumber } from './format'
import { ModelId } from './models'
import { getVariableTab, Variable } from './variables'

export interface RunValues {
    series: Series[]
    median: (number | null)[]
}

// A variable pair read together on phones, whichever sub-tab is open: the actual value with its companion in brackets,
// "17.2 (15.0)" for temperature and feels-like.
export interface PairedRuns {
    primary: RunValues
    secondary: RunValues
}

export const toPairedRuns = (variable: Variable, selected: RunValues, companion: RunValues): PairedRuns =>
    getVariableTab(variable) === variable
        ? { primary: selected, secondary: companion }
        : { primary: companion, secondary: selected }

const getModelValue = (run: RunValues, modelId: ModelId, index: number) =>
    run.series.find((s) => s.modelId === modelId)?.values[index] ?? null

const formatPair = (primary: number | null, secondary: number | null, decimals: number) =>
    `${formatNumber(primary, decimals)} (${formatNumber(secondary, decimals)})`

export const formatPairedModel = (runs: PairedRuns, modelId: ModelId, index: number, decimals: number) =>
    formatPair(getModelValue(runs.primary, modelId, index), getModelValue(runs.secondary, modelId, index), decimals)

export const formatPairedMedian = (runs: PairedRuns, index: number, decimals: number) =>
    formatPair(runs.primary.median[index] ?? null, runs.secondary.median[index] ?? null, decimals)

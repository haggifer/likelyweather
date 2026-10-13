import { Series } from './api'
import { ModelId } from './models'

export interface LegendRow {
    modelId: ModelId
    value: number | null
    isHidden: boolean
}

// The models at the readout slot, shown ones first, each group highest first; a model without a value goes last.
export const getLegendRows = (series: Series[], readoutIndex: number, hidden: ModelId[]): LegendRow[] =>
    series
        .map((s) => ({
            modelId: s.modelId,
            value: s.values[readoutIndex] ?? null,
            isHidden: hidden.includes(s.modelId),
        }))
        .sort((a, b) => Number(a.isHidden) - Number(b.isHidden) || (b.value ?? -Infinity) - (a.value ?? -Infinity))

import { getLegendRows } from './legend-rows'
import { ModelId } from './models'

describe('getLegendRows', () => {
    it('puts shown models first, highest first, and models without a value last', () => {
        const series = [
            { modelId: ModelId.Gfs, values: [4] },
            { modelId: ModelId.EcmwfIfs, values: [6] },
            { modelId: ModelId.Metno, values: [null] },
            { modelId: ModelId.IconEu, values: [9] },
        ]

        const rows = getLegendRows(series, 0, [ModelId.IconEu])

        expect(rows.map((r) => r.modelId)).toEqual([ModelId.EcmwfIfs, ModelId.Gfs, ModelId.Metno, ModelId.IconEu])
        expect(rows[2]).toEqual({ modelId: ModelId.Metno, value: null, isHidden: false })
        expect(rows[3].isHidden).toBe(true)
    })
})

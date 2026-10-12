import { Variable } from '@fa/shared/variables'
import { keepSameVariable } from './placeholder'

describe('keepSameVariable', () => {
    it('keeps the previous answer while another city of the same variable loads', () => {
        expect(keepSameVariable(Variable.Temp)('previous', { queryKey: ['latest', 'kyiv', Variable.Temp] })).toBe(
            'previous',
        )
    })

    it('drops the previous answer when the variable changed', () => {
        expect(
            keepSameVariable(Variable.Wind)('previous', { queryKey: ['latest', 'kyiv', Variable.Temp] }),
        ).toBeUndefined()
    })
})

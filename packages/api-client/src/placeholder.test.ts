import { CompareResponse } from '@fa/shared/api'
import { Variable } from '@fa/shared/variables'
import { keepCompareCities, keepSameVariable } from './placeholder'

const city = (slug: string) => ({ slug }) as CompareResponse['items'][number]['city']

const COMPARE = {
    items: [
        { city: city('kyiv'), latest: null },
        { city: city('lviv'), latest: null },
    ],
} as CompareResponse

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

describe('keepCompareCities', () => {
    it('drops a removed city from the placeholder', () => {
        const kept = keepCompareCities(['kyiv'], Variable.Temp)(COMPARE, {
            queryKey: ['compare', 'kyiv,lviv', Variable.Temp],
        })

        expect(kept?.items.map((item) => item.city.slug)).toEqual(['kyiv'])
    })

    it('shows no placeholder for another variable', () => {
        expect(
            keepCompareCities(['kyiv', 'lviv'], Variable.Wind)(COMPARE, {
                queryKey: ['compare', 'kyiv,lviv', Variable.Temp],
            }),
        ).toBeUndefined()
    })
})

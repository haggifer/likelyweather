import { Variable } from '@fa/shared/variables'
import { act, renderHook } from '@testing-library/react-native'
import { getSelectedVariableState, setSelectedVariable } from '../lib/selected-variable-store'
import { useSelectedVariable } from './useSelectedVariable'

const mockSetParams = jest.fn()
let mockParams: { v?: string } = {}
let mockIsFocused = true

jest.mock('expo-router', () => ({
    useRouter: () => ({ setParams: mockSetParams }),
    useIsFocused: () => mockIsFocused,
    useLocalSearchParams: () => mockParams,
}))

describe('useSelectedVariable', () => {
    beforeEach(() => {
        mockParams = {}
        mockIsFocused = true
        mockSetParams.mockReset()
    })

    it('opens on the param from the first render and shares it', async () => {
        setSelectedVariable(Variable.Pressure)
        mockParams = { v: 'wind' }

        const { result } = await renderHook(() => useSelectedVariable())

        expect(result.current.variable).toBe(Variable.Wind)
        expect(getSelectedVariableState().variable).toBe(Variable.Wind)
    })

    it('opens on the shared choice without a param, and a change updates the store and the param', async () => {
        setSelectedVariable(Variable.Precip)

        const { result } = await renderHook(() => useSelectedVariable())

        expect(result.current.variable).toBe(Variable.Precip)

        await act(() => result.current.setVariable(Variable.Temp))

        expect(result.current.variable).toBe(Variable.Temp)
        expect(getSelectedVariableState().variable).toBe(Variable.Temp)
        expect(mockSetParams).toHaveBeenCalledWith({ v: Variable.Temp })
    })

    it('takes a change made on another screen once it is shown again', async () => {
        mockParams = { v: 'wind' }

        const { result, rerender } = await renderHook(() => useSelectedVariable())

        mockIsFocused = false
        await act(() => setSelectedVariable(Variable.Pressure))

        expect(result.current.variable).toBe(Variable.Wind)

        mockIsFocused = true
        await rerender({})

        expect(result.current.variable).toBe(Variable.Pressure)
    })
})

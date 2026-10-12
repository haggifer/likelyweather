import { Variable } from '@fa/shared/variables'
import {
    getSelectedVariableState,
    parseVariable,
    resolveVariable,
    setSelectedVariable,
    subscribeSelectedVariable,
} from './selected-variable-store'

describe('selected variable store', () => {
    it('counts each change and tells subscribers only about changes', () => {
        const onChange = jest.fn()
        const unsubscribe = subscribeSelectedVariable(onChange)
        const { version } = getSelectedVariableState()

        setSelectedVariable(Variable.Wind)
        setSelectedVariable(Variable.Wind)
        setSelectedVariable(Variable.Pressure)

        expect(getSelectedVariableState()).toEqual({ variable: Variable.Pressure, version: version + 2 })
        expect(onChange).toHaveBeenCalledTimes(2)

        unsubscribe()
        setSelectedVariable(Variable.Precip)

        expect(onChange).toHaveBeenCalledTimes(2)
    })

    it('reads only known variables from a route param', () => {
        expect(parseVariable('wind')).toBe(Variable.Wind)
        expect(parseVariable('snow')).toBeNull()
        expect(parseVariable(['wind'])).toBeNull()
        expect(parseVariable(undefined)).toBeNull()
    })

    it('lets the param win until the variable changes, then the store, then temperature', () => {
        const stored = { variable: Variable.Pressure, version: 3 }

        expect(resolveVariable({ variable: Variable.Wind, version: 3 }, stored)).toBe(Variable.Wind)
        expect(resolveVariable({ variable: null, version: 3 }, stored)).toBe(Variable.Pressure)
        expect(resolveVariable({ variable: Variable.Wind, version: 2 }, stored)).toBe(Variable.Pressure)
        expect(resolveVariable({ variable: null, version: 0 }, { variable: null, version: 0 })).toBe(Variable.Temp)
    })
})

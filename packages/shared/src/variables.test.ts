import {
    DISAGREEMENT_VARIABLES,
    getCompanion,
    getDataVariable,
    getVariablePair,
    getVariableTab,
    PHONE_VARIABLES,
    STORED_VARIABLES,
    Variable,
} from './variables'

describe('variables', () => {
    it('draws the chance of rain from the precipitation run and never asks the API for it', () => {
        expect(getDataVariable(Variable.Chance)).toBe(Variable.Precip)
        expect(getDataVariable(Variable.Wind)).toBe(Variable.Wind)
        expect(STORED_VARIABLES).not.toContain(Variable.Chance)
        expect(STORED_VARIABLES).toContain(Variable.Precip)
    })

    it('puts the chance of rain under the precipitation tab on phones', () => {
        expect(getVariablePair(Variable.Chance)).toEqual([Variable.Precip, Variable.Chance])
        expect(getVariableTab(Variable.Chance)).toBe(Variable.Precip)
        expect(PHONE_VARIABLES).not.toContain(Variable.Chance)
    })

    it('reads a companion only for a pair of the same kind of value', () => {
        expect(getCompanion(Variable.Temp)).toBe(Variable.Feels)
        expect(getCompanion(Variable.Gusts)).toBe(Variable.Wind)
        expect(getCompanion(Variable.Precip)).toBeNull()
        expect(getCompanion(Variable.Chance)).toBeNull()
        expect(getCompanion(Variable.Pressure)).toBeNull()
    })

    it('lists disagreement thresholds for every variable but the chance of rain', () => {
        expect(DISAGREEMENT_VARIABLES.map((v) => v.id)).not.toContain(Variable.Chance)
        expect(DISAGREEMENT_VARIABLES).toHaveLength(STORED_VARIABLES.length)
    })
})

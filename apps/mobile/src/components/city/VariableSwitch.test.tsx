import en from '@fa/messages/catalogs/en.json'
import { Variable, VARIABLES } from '@fa/shared/variables'
import { render, screen } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'
import { IntlProvider } from 'use-intl'
import { VariableSwitch } from './VariableSwitch'

const renderSwitch = (value: Variable) =>
    render(
        <IntlProvider locale="en" messages={en}>
            <VariableSwitch value={value} onChange={jest.fn()} />
        </IntlProvider>,
    )

const getFlex = (name: string) => StyleSheet.flatten(screen.getByRole('radio', { name }).props.style).flex

describe('VariableSwitch', () => {
    it('offers every variable by name', async () => {
        await renderSwitch(Variable.Temp)

        expect(screen.getAllByRole('radio')).toHaveLength(VARIABLES.length)
        VARIABLES.forEach(({ id }) => expect(screen.getByRole('radio', { name: en.variables[id] })).toBeOnTheScreen())
    })

    it('names only the selected variable and gives it the wider segment', async () => {
        await renderSwitch(Variable.Humidity)

        expect(screen.getByText(en.variables.humidity)).toBeOnTheScreen()
        expect(screen.queryByText(en.variables.temp)).toBeNull()
        expect(getFlex(en.variables.humidity)).toBe(3.4)
        expect(getFlex(en.variables.temp)).toBe(1)
    })
})

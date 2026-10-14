import en from '@fa/messages/catalogs/en.json'
import { PHONE_VARIABLES, Variable } from '@fa/shared/variables'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { IntlProvider } from 'use-intl'
import { VariableSwitch } from './VariableSwitch'

const renderSwitch = (value: Variable, onChange = jest.fn()) =>
    render(
        <IntlProvider locale="en" messages={en}>
            <VariableSwitch value={value} onChange={onChange} />
        </IntlProvider>,
    )

const getClassName = (name: string): string => screen.getByRole('radio', { name }).props.className

const getTabName = (id: Variable) =>
    id === Variable.Temp || id === Variable.Wind ? en.variableTabs[id] : en.variables[id]

describe('VariableSwitch', () => {
    it('names each pair once and every other variable by its own name', async () => {
        await renderSwitch(Variable.Temp)

        expect(screen.getAllByRole('radio')).toHaveLength(PHONE_VARIABLES.length)
        PHONE_VARIABLES.forEach((id) => expect(screen.getByRole('radio', { name: getTabName(id) })).toBeOnTheScreen())
        expect(screen.queryByRole('radio', { name: en.variables.feels })).toBeNull()
    })

    it('selects the pair of a companion variable', async () => {
        await renderSwitch(Variable.Gusts)

        expect(screen.getByRole('radio', { name: en.variableTabs.wind })).toBeChecked()
    })

    it('names only the selected variable and gives it the wider segment', async () => {
        await renderSwitch(Variable.Humidity)

        expect(screen.getByText(en.variables.humidity)).toBeOnTheScreen()
        expect(screen.queryByText(en.variableTabs.temp)).toBeNull()
        expect(screen.getByRole('radio', { name: en.variables.humidity })).toBeChecked()
        expect(getClassName(en.variables.humidity)).toContain('flex-[3.4]')
        expect(getClassName(en.variableTabs.temp)).toContain('flex-1')
    })

    it('switches on a tap and keeps the selected variable when it is tapped again', async () => {
        const onChange = jest.fn()

        await renderSwitch(Variable.Temp, onChange)
        await fireEvent.press(screen.getByRole('radio', { name: en.variableTabs.temp }))
        await fireEvent.press(screen.getByRole('radio', { name: en.variableTabs.wind }))

        expect(onChange.mock.calls).toEqual([[Variable.Wind]])
    })
})

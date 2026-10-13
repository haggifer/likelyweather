import en from '@fa/messages/catalogs/en.json'
import { Variable, VARIABLES } from '@fa/shared/variables'
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
        expect(screen.getByRole('radio', { name: en.variables.humidity })).toBeChecked()
        expect(getClassName(en.variables.humidity)).toContain('flex-[3.4]')
        expect(getClassName(en.variables.temp)).toContain('flex-1')
    })

    it('switches on a tap and keeps the selected variable when it is tapped again', async () => {
        const onChange = jest.fn()

        await renderSwitch(Variable.Temp, onChange)
        await fireEvent.press(screen.getByRole('radio', { name: en.variables.temp }))
        await fireEvent.press(screen.getByRole('radio', { name: en.variables.wind }))

        expect(onChange.mock.calls).toEqual([[Variable.Wind]])
    })
})

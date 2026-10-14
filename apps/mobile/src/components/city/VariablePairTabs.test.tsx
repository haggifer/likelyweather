import en from '@fa/messages/catalogs/en.json'
import { Variable } from '@fa/shared/variables'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { IntlProvider } from 'use-intl'
import { VariablePairTabs } from './VariablePairTabs'

const renderTabs = (value: Variable, onChange = jest.fn()) =>
    render(
        <IntlProvider locale="en" messages={en}>
            <VariablePairTabs value={value} onChange={onChange} />
        </IntlProvider>,
    )

describe('VariablePairTabs', () => {
    it('offers the actual value and its companion, with the open one checked', async () => {
        await renderTabs(Variable.Feels)

        expect(screen.getAllByRole('radio')).toHaveLength(2)
        expect(screen.getByRole('radio', { name: en.subVariables.temp })).not.toBeChecked()
        expect(screen.getByRole('radio', { name: en.subVariables.feels })).toBeChecked()
    })

    it('switches within the pair and keeps the open one when it is tapped again', async () => {
        const onChange = jest.fn()

        await renderTabs(Variable.Wind, onChange)
        await fireEvent.press(screen.getByRole('radio', { name: en.subVariables.wind }))
        await fireEvent.press(screen.getByRole('radio', { name: en.subVariables.gusts }))

        expect(onChange.mock.calls).toEqual([[Variable.Gusts]])
    })

    it('renders nothing for a variable without a companion', async () => {
        await renderTabs(Variable.Pressure)

        expect(screen.queryAllByRole('radio')).toHaveLength(0)
    })
})

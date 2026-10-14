import en from '@fa/messages/catalogs/en.json'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { Text } from 'react-native'
import { IntlProvider } from 'use-intl'
import { ChartFrame } from './ChartFrame'

const renderFrame = () =>
    render(
        <IntlProvider locale="en" messages={en}>
            <ChartFrame title="Temperature" table={<Text>numbers</Text>}>
                <Text>chart</Text>
            </ChartFrame>
        </IntlProvider>,
    )

describe('ChartFrame', () => {
    it('swaps the chart for the table and says the table is on', async () => {
        await renderFrame()

        expect(screen.getByText('chart')).toBeOnTheScreen()

        await fireEvent.press(screen.getByRole('button', { name: en.chart.showTable }))

        expect(screen.getByText('numbers')).toBeOnTheScreen()
        expect(screen.queryByText('chart')).toBeNull()
        expect(screen.getByRole('button', { name: en.chart.showChart })).toBeSelected()
    })
})

import en from '@fa/messages/catalogs/en.json'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { Text } from 'react-native'
import { IntlProvider } from 'use-intl'
import { ChartFrame } from './ChartFrame'

const renderFrame = (emptyMessage: string | null = null) =>
    render(
        <IntlProvider locale="en" messages={en}>
            <ChartFrame title="Temperature" table={<Text>numbers</Text>} emptyMessage={emptyMessage}>
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

    // The view mode is shared, so the frame may open on either view.
    it('keeps the no-data message over both the chart and the table', async () => {
        await renderFrame(en.chart.noData)

        const toggle = new RegExp(`${en.chart.showTable}|${en.chart.showChart}`)

        expect(screen.getByText(en.chart.noData)).toBeOnTheScreen()

        await fireEvent.press(screen.getByRole('button', { name: toggle }))

        expect(screen.getByText(en.chart.noData)).toBeOnTheScreen()
    })

    it('shows no message while there is data', async () => {
        await renderFrame()

        expect(screen.queryByText(en.chart.noData)).toBeNull()
    })
})

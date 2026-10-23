import en from '@fa/messages/catalogs/en.json'
import { ModelId } from '@fa/shared/models'
import { render, screen } from '@testing-library/react-native'
import { IntlProvider } from 'use-intl'
import { SeriesTable } from './SeriesTable'

const STEPS = ['2026-10-12T00:00:00.000Z', '2026-10-12T03:00:00.000Z']
const SERIES = [{ modelId: ModelId.Gfs, values: [16, 17] }]
const STATS = { median: [15.5, 16.5], min: [15, 16], max: [16, 17], count: [1, 1] }

const renderTable = (isMedianHidden: boolean) =>
    render(
        <IntlProvider locale="en" messages={en}>
            <SeriesTable
                steps={STEPS}
                series={SERIES}
                stats={STATS}
                decimals={1}
                modelDecimals={1}
                modelUnit={null}
                medianLabel={en.dashboard.median}
                timeZone="UTC"
                locale="en"
                pairedRuns={null}
                isMedianHidden={isMedianHidden}
            />
        </IntlProvider>,
    )

describe('SeriesTable', () => {
    it('heads the median before the models', async () => {
        await renderTable(false)

        expect(screen.getByText('Median')).toBeOnTheScreen()
        expect(screen.getByText('15.5')).toBeOnTheScreen()
    })

    it('drops the median column while the median is hidden', async () => {
        await renderTable(true)

        expect(screen.queryByText('Median')).toBeNull()
        expect(screen.queryByText('15.5')).toBeNull()
        expect(screen.getByText('16.0')).toBeOnTheScreen()
    })

    it("lists the chance of rain in percent and each model's amount in millimetres", async () => {
        await render(
            <IntlProvider locale="en" messages={en}>
                <SeriesTable
                    steps={STEPS}
                    series={[{ modelId: ModelId.Gfs, values: [0.6, 0] }]}
                    stats={{ median: [100, 0], min: [null, null], max: [null, null], count: [1, 1] }}
                    decimals={0}
                    modelDecimals={1}
                    modelUnit="mm"
                    medianLabel={`${en.variables.chance}, %`}
                    timeZone="UTC"
                    locale="en"
                    pairedRuns={null}
                    isMedianHidden={false}
                />
            </IntlProvider>,
        )

        expect(screen.getByText('Chance of rain, %')).toBeOnTheScreen()
        expect(screen.getByText('GFS, mm')).toBeOnTheScreen()
        expect(screen.getByText('100')).toBeOnTheScreen()
        expect(screen.getByText('0.6')).toBeOnTheScreen()
    })
})

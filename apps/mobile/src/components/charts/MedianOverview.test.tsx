import { MedianSeries } from '@fa/chart-core/overview-stats'
import en from '@fa/messages/catalogs/en.json'
import { OVERVIEW_VARIABLES, OverviewVariable, Variable } from '@fa/shared/variables'
import { render, screen } from '@testing-library/react-native'
import { IntlProvider } from 'use-intl'
import { MedianOverview } from './MedianOverview'

const SLOTS = ['2026-10-12T00:00:00.000Z', '2026-10-12T03:00:00.000Z', '2026-10-12T06:00:00.000Z']
const VALUES: Record<OverviewVariable, (number | null)[]> = {
    [Variable.Temp]: [16, 17, 18],
    [Variable.Feels]: [14.5, 15, 16],
    [Variable.Wind]: [5, 6, 7],
    [Variable.Gusts]: [8.5, 9, 10],
    [Variable.Pressure]: [1012, 1013, 1014],
    [Variable.Precip]: [0.4, 0, 0],
}
const SERIES = Object.fromEntries(
    OVERVIEW_VARIABLES.map((variable) => [variable, { steps: SLOTS, values: VALUES[variable] }]),
) as Record<OverviewVariable, MedianSeries>
const NOW = new Date('2026-10-12T00:30:00.000Z')

const renderOverview = (series = SERIES) =>
    render(
        <IntlProvider locale="en" messages={en}>
            <MedianOverview
                series={series}
                directions={null}
                chance={[0.4, 0, null]}
                timeZone="UTC"
                locale="en"
                now={NOW}
                summaryStart={new Date(SLOTS[0])}
                accessibilityLabel="Overview"
            />
        </IntlProvider>,
    )

describe('MedianOverview', () => {
    it('adds feels-like, gusts and the chance of rain under their readouts', async () => {
        await renderOverview()

        expect(screen.getByText('Feels like: 14.5 °C')).toBeOnTheScreen()
        expect(screen.getByText('Wind gusts: 8.5 m/s')).toBeOnTheScreen()
        expect(screen.getByText('Chance of rain: 40 %')).toBeOnTheScreen()
    })

    it('shows an unknown gust when no model has gusts', async () => {
        await renderOverview({ ...SERIES, [Variable.Gusts]: { steps: SLOTS, values: [null, null, null] } })

        expect(screen.getByText('Wind gusts: – m/s')).toBeOnTheScreen()
    })
})

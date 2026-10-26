import { OverviewMedians } from '@fa/chart-core/overview-stats'
import en from '@fa/messages/catalogs/en.json'
import { formatDayLabel } from '@fa/shared/format'
import { Variable } from '@fa/shared/variables'
import { render, screen } from '@testing-library/react-native'
import { IntlProvider } from 'use-intl'
import { OverviewTable } from './OverviewTable'

const SLOTS = ['2026-10-12T00:00:00.000Z', '2026-10-12T03:00:00.000Z']
const SERIES: OverviewMedians = {
    [Variable.Temp]: { steps: SLOTS, values: [16, 17] },
    [Variable.Feels]: { steps: SLOTS, values: [14.5, 15] },
    [Variable.Precip]: { steps: SLOTS, values: [0.4, 0] },
}

const renderTable = (chance: (number | null)[] | null) =>
    render(
        <IntlProvider locale="en" messages={en}>
            <OverviewTable
                panels={[Variable.Temp, Variable.Precip]}
                series={SERIES}
                chance={chance}
                timeZone="UTC"
                locale="en"
            />
        </IntlProvider>,
    )

describe('OverviewTable', () => {
    it('heads a row for each panel and its second line with their units, in the panels order', async () => {
        await renderTable([0.4, 0])

        const heads = screen.getAllByRole('header').map((head) => head.props.children)

        expect(heads).toEqual(['Temperature, °C', 'Feels like, °C', 'Precipitation, mm', 'Chance of rain, %'])
    })

    it('gives every slot a column under its day and time, with the values of each row', async () => {
        await renderTable([0.4, 0])

        expect(screen.getByLabelText(formatDayLabel(SLOTS[0], 'UTC', 'en'))).toBeOnTheScreen()
        expect(screen.getByText('00:00')).toBeOnTheScreen()
        expect(screen.getByText('03:00')).toBeOnTheScreen()
        expect(screen.getByText('16.0')).toBeOnTheScreen()
        expect(screen.getByText('14.5')).toBeOnTheScreen()
        expect(screen.getByText('40')).toBeOnTheScreen()
    })

    it('has no chance-of-rain row without a chance of rain', async () => {
        await renderTable(null)

        expect(screen.queryByText('Chance of rain, %')).toBeNull()
    })
})

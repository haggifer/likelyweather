import { MedianSeries } from '@fa/chart-core/overview-stats'
import { MIN_SLOT_WIDTH } from '@fa/chart-core/scroll-geometry'
import en from '@fa/messages/catalogs/en.json'
import { DEFAULT_OVERVIEW_PANELS, getVisiblePanels, PanelVariable } from '@fa/shared/overview-panels'
import { buildSlots } from '@fa/shared/slots'
import { OVERVIEW_VARIABLES, OverviewVariable, Variable } from '@fa/shared/variables'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { ReactNode } from 'react'
import { ViewProps } from 'react-native'
import { IntlProvider } from 'use-intl'
import { DayGrid } from './DayGrid'
import { MedianOverview } from './MedianOverview'

// The day grid is drawn only by the overview's static layer, so its calls count that layer's renders.
jest.mock('./DayGrid', () => {
    const actual = jest.requireActual<typeof import('./DayGrid')>('./DayGrid')

    return { DayGrid: jest.fn(actual.DayGrid) }
})

// The tap gesture has no Jest driver; a host view hands its `onSelect` to `fireEvent`.
jest.mock('./TapSurface', () => {
    const { createElement } = jest.requireActual<typeof import('react')>('react')
    const { View } = jest.requireActual<typeof import('react-native')>('react-native')

    return {
        TapSurface: ({ onSelect, children }: { onSelect: (x: number) => void; children: ReactNode }) =>
            createElement(View, { testID: 'tap-surface', onSelect } as ViewProps, children),
    }
})

const SLOTS = ['2026-10-12T00:00:00.000Z', '2026-10-12T03:00:00.000Z', '2026-10-12T06:00:00.000Z']
const VALUES: Record<OverviewVariable, (number | null)[]> = {
    [Variable.Temp]: [16, 17, 18],
    [Variable.Feels]: [14.5, 15, 16],
    [Variable.Wind]: [5, 6, 7],
    [Variable.Gusts]: [8.5, 9, 10],
    [Variable.Pressure]: [1012, 1013, 1014],
    [Variable.Precip]: [0.4, 0, 0],
    [Variable.Humidity]: [72, 75, 80],
    [Variable.Cloud]: [10, 40, 90],
}
const SERIES = Object.fromEntries(
    OVERVIEW_VARIABLES.map((variable) => [variable, { steps: SLOTS, values: VALUES[variable] }]),
) as Record<OverviewVariable, MedianSeries>
const NOW = new Date('2026-10-12T00:30:00.000Z')
const TEN_DAYS = buildSlots(new Date(SLOTS[0]), 240)
const TEN_DAY_SERIES = Object.fromEntries(
    OVERVIEW_VARIABLES.map((variable) => [variable, { steps: TEN_DAYS, values: TEN_DAYS.map((_, i) => i) }]),
) as Record<OverviewVariable, MedianSeries>
// The overview's left margin, where the first slot sits.
const PLOT_LEFT = 36

const DEFAULT_PANELS = getVisiblePanels(DEFAULT_OVERVIEW_PANELS)

const renderOverview = (
    series = SERIES,
    chance: (number | null)[] = [0.4, 0, null],
    panels: PanelVariable[] = DEFAULT_PANELS,
) =>
    render(
        <IntlProvider locale="en" messages={en}>
            <MedianOverview
                panels={panels}
                series={series}
                directions={null}
                chance={chance}
                timeZone="UTC"
                locale="en"
                now={NOW}
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

    it('draws the chart inside a sideways scroll view, wider than the screen', async () => {
        await renderOverview(
            TEN_DAY_SERIES,
            TEN_DAYS.map(() => 0),
        )
        await fireEvent(screen.getByLabelText('Overview'), 'layout', { nativeEvent: { layout: { width: 360 } } })

        expect(screen.getByTestId('overview-scroll').props.horizontal).toBe(true)
        expect(screen.getByTestId('overview-plot').props.width).toBeGreaterThan(360)
    })

    it('re-renders only the selection layer when a tap picks a slot', async () => {
        await renderOverview(
            TEN_DAY_SERIES,
            TEN_DAYS.map(() => 0),
        )
        await fireEvent(screen.getByLabelText('Overview'), 'layout', { nativeEvent: { layout: { width: 360 } } })
        const drawn = jest.mocked(DayGrid).mock.calls.length

        await fireEvent(screen.getByTestId('tap-surface'), 'select', PLOT_LEFT + 10 * MIN_SLOT_WIDTH)

        expect(screen.getByText('10.0 °C')).toBeOnTheScreen()
        expect(drawn).toBeGreaterThan(0)
        expect(jest.mocked(DayGrid).mock.calls.length).toBe(drawn)
    })

    it('draws the default four panels and no humidity', async () => {
        await renderOverview()

        expect(screen.getByText(en.variables.pressure)).toBeOnTheScreen()
        expect(screen.queryByText(en.variables.humidity)).toBeNull()
    })

    it('shows a humidity readout in percent, without a second line, when its panel is shown', async () => {
        await renderOverview(SERIES, [0.4, 0, null], [Variable.Humidity, Variable.Temp])

        expect(screen.getByText(en.variables.humidity)).toBeOnTheScreen()
        expect(screen.getByText('72 %')).toBeOnTheScreen()
        expect(screen.queryByText(en.variables.wind)).toBeNull()
        expect(screen.queryByText(/Chance of rain/)).toBeNull()
    })

    it('orders the readouts as the panels', async () => {
        await renderOverview(SERIES, [0.4, 0, null], [Variable.Cloud, Variable.Temp])

        const names = screen.getAllByText(new RegExp(`^(${en.variables.temp}|${en.variables.cloud})$`))

        expect(names.map((name) => name.props.children)).toEqual([en.variables.cloud, en.variables.temp])
    })

    it('draws past weather without a chance of rain, reading precipitation over the past 3 hours', async () => {
        await render(
            <IntlProvider locale="en" messages={en}>
                <MedianOverview
                    panels={DEFAULT_PANELS}
                    series={SERIES}
                    directions={null}
                    chance={null}
                    timeZone="UTC"
                    locale="en"
                    now={null}
                    isArchive
                    accessibilityLabel="Archive"
                />
            </IntlProvider>,
        )

        expect(screen.queryByText(/Chance of rain/)).toBeNull()
        expect(screen.getByText('mm / 3 h')).toBeOnTheScreen()
        expect(screen.getByText('16.0 °C')).toBeOnTheScreen()
    })

    it('shows no next-24-hour summary', async () => {
        await renderOverview()

        expect(screen.queryByText(/Next 24 hours/)).toBeNull()
    })
})

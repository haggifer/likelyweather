import { MIN_SLOT_WIDTH } from '@fa/chart-core/scroll-geometry'
import en from '@fa/messages/catalogs/en.json'
import { Series } from '@fa/shared/api'
import { computeEnsemble } from '@fa/shared/ensemble'
import { ModelId } from '@fa/shared/models'
import { buildSlots } from '@fa/shared/slots'
import { Variable } from '@fa/shared/variables'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { ReactNode, useState } from 'react'
import { ViewProps } from 'react-native'
import { IntlProvider } from 'use-intl'
import { CanvasDayGrid } from './CanvasDayGrid'
import { SpaghettiChart } from './SpaghettiChart'

// The day grid is drawn only by the chart's static layer, so its calls count that layer's renders.
jest.mock('./CanvasDayGrid', () => {
    const actual = jest.requireActual<typeof import('./CanvasDayGrid')>('./CanvasDayGrid')

    return { CanvasDayGrid: jest.fn(actual.CanvasDayGrid) }
})

// The tap gesture has no Jest driver; a host view hands its `onSelect` and `onClear` to `fireEvent`.
jest.mock('./TapSurface', () => {
    const { createElement } = jest.requireActual<typeof import('react')>('react')
    const { View } = jest.requireActual<typeof import('react-native')>('react-native')

    return {
        TapSurface: ({
            onSelect,
            onClear,
            children,
        }: {
            onSelect: (x: number) => void
            onClear?: () => void
            children: ReactNode
        }) => createElement(View, { testID: 'tap-surface', onSelect, onClear } as ViewProps, children),
    }
})

const STEPS = buildSlots(new Date('2026-10-12T00:00:00.000Z'), 240)
const SERIES: Series[] = [
    { modelId: ModelId.EcmwfIfs, values: STEPS.map((_, i) => i % 24) },
    { modelId: ModelId.IconEu, values: STEPS.map((_, i) => (i % 24) + 2) },
]
const STATS = computeEnsemble(
    SERIES.map((s) => s.values),
    STEPS.length,
)
// The chart's left margin, where the first slot sits.
const PLOT_LEFT = 44
const LAYOUT = { nativeEvent: { layout: { width: 360 } } }

interface ChartProps {
    onHoverIndex: (index: number | null) => void
}

// The screen keeps the picked slot, as the City screen does.
const PickableChart = ({ onHoverIndex }: ChartProps) => {
    const [hoverIndex, setHoverIndex] = useState<number | null>(null)

    const handleHoverIndex = (index: number | null) => {
        setHoverIndex(index)
        onHoverIndex(index)
    }

    return (
        <SpaghettiChart
            steps={STEPS}
            series={SERIES}
            stats={STATS}
            variable={Variable.Temp}
            timeZone="UTC"
            locale="en"
            accessibilityLabel="Temperature chart"
            hoverIndex={hoverIndex}
            onHoverIndex={handleHoverIndex}
            now={new Date('2026-10-12T00:30:00.000Z')}
        />
    )
}

const renderChart = async (onHoverIndex = jest.fn()) => {
    await render(
        <IntlProvider locale="en" messages={en}>
            <PickableChart onHoverIndex={onHoverIndex} />
        </IntlProvider>,
    )
    await fireEvent(screen.getByLabelText('Temperature chart'), 'layout', LAYOUT)
}

describe('SpaghettiChart', () => {
    it('draws on a canvas behind a sideways scroll view wider than the screen', async () => {
        await renderChart()

        expect(screen.getByTestId('spaghetti-canvas')).toBeOnTheScreen()
        expect(screen.getByTestId('spaghetti-scroll').props.horizontal).toBe(true)
        expect(screen.getByTestId('spaghetti-plot').props.style.width).toBeGreaterThan(360)
    })

    it('picks the tapped slot and re-renders only the selection layer', async () => {
        const onHoverIndex = jest.fn()

        await renderChart(onHoverIndex)
        const drawn = jest.mocked(CanvasDayGrid).mock.calls.length

        await fireEvent(screen.getByTestId('tap-surface'), 'select', PLOT_LEFT + 10 * MIN_SLOT_WIDTH)

        expect(onHoverIndex).toHaveBeenCalledWith(10)
        expect(drawn).toBeGreaterThan(0)
        expect(jest.mocked(CanvasDayGrid).mock.calls.length).toBe(drawn)
    })

    it('clears the pick on a tap beside the plot', async () => {
        const onHoverIndex = jest.fn()

        await renderChart(onHoverIndex)
        await fireEvent(screen.getByTestId('tap-surface'), 'clear')

        expect(onHoverIndex).toHaveBeenCalledWith(null)
    })
})

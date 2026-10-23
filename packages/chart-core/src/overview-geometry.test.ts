import { HOUR_MS } from '@fa/shared/constants'
import { Variable } from '@fa/shared/variables'
import {
    AXIS_HEIGHT,
    getArrowY,
    getChanceLabels,
    getChanceY,
    getHoverDots,
    getOverviewContentWidth,
    getOverviewFrame,
    getOverviewLayout,
    getOverviewStepMs,
    getPanelBars,
    getPanelHeight,
    getPanelPaths,
    getPanelScale,
    HOVER_STRIP,
    OVERVIEW_SIZE,
    ROW_GAP,
} from './overview-geometry'
import { OverviewMedians } from './overview-stats'
import { MIN_ARCHIVE_HOUR_WIDTH, MIN_SLOT_WIDTH } from './scroll-geometry'

const SLOTS = ['2026-10-12T00:00:00.000Z', '2026-10-12T03:00:00.000Z', '2026-10-12T06:00:00.000Z']
const TIMES = SLOTS.map((s) => new Date(s))
const SERIES: OverviewMedians = {
    [Variable.Temp]: { steps: SLOTS, values: [16, 17, 18] },
    [Variable.Feels]: { steps: SLOTS, values: [14.5, 15, null] },
    [Variable.Wind]: { steps: SLOTS, values: [5, 6, 7] },
    [Variable.Gusts]: { steps: SLOTS, values: [8.5, 9, 10] },
    [Variable.Precip]: { steps: SLOTS, values: [0.4, null, 2] },
}
const { heights: HEIGHTS, marginLeft: LEFT } = OVERVIEW_SIZE
const PANELS = [Variable.Temp, Variable.Wind, Variable.Precip] as const

describe('getOverviewLayout', () => {
    it('stacks the panels under the hover strip with a gap between them, the axis labels under the last', () => {
        const layout = getOverviewLayout(HEIGHTS, [...PANELS], true)
        const [temp, wind, precip] = layout.rows

        expect(temp).toEqual({ variable: Variable.Temp, top: HOVER_STRIP, height: 104, bottom: HOVER_STRIP + 104 - 6 })
        expect(wind.top).toBe(temp.top + temp.height + ROW_GAP)
        // The wind's arrow strip and the chance-of-rain strip sit under their plots.
        expect(wind.bottom).toBe(wind.top + 100 - 6 - 20)
        expect(precip.height).toBe(80 + 22)
        expect(precip.bottom).toBe(precip.top + precip.height - 6 - 22)
        expect(layout.plotTop).toBe(HOVER_STRIP)
        expect(layout.plotBottom).toBe(precip.top + precip.height)
        expect(layout.totalHeight).toBe(layout.plotBottom + AXIS_HEIGHT)
        expect(layout.spans[1]).toEqual({ top: wind.top, bottom: wind.top + wind.height })
    })

    it('keeps the precipitation panel at its own height without a chance of rain (the archive)', () => {
        expect(getPanelHeight(HEIGHTS, Variable.Precip, false)).toBe(80)
        expect(getOverviewLayout(HEIGHTS, [Variable.Precip], false).rows[0].bottom).toBe(HOVER_STRIP + 80 - 6)
    })

    it('lays out no panels as an empty strip rather than failing', () => {
        expect(getOverviewLayout(HEIGHTS, [], true)).toEqual({
            rows: [],
            spans: [],
            plotTop: HOVER_STRIP,
            plotBottom: HOVER_STRIP,
            totalHeight: HOVER_STRIP + AXIS_HEIGHT,
        })
    })

    it('centres the strips under a panel', () => {
        expect(getChanceY(100)).toBe(113)
        expect(getArrowY(100)).toBe(112)
    })
})

describe('overview frame', () => {
    it('steps every 3 hours, or every hour in the archive', () => {
        expect(getOverviewStepMs(false)).toBe(3 * HOUR_MS)
        expect(getOverviewStepMs(true)).toBe(HOUR_MS)
    })

    it('grows past a narrow screen by the narrowest slot, narrower in the archive', () => {
        expect(getOverviewContentWidth(360, 81, LEFT, false)).toBe(LEFT + 8 + 80 * MIN_SLOT_WIDTH)
        expect(getOverviewContentWidth(360, 81, LEFT, true)).toBe(LEFT + 8 + 80 * MIN_ARCHIVE_HOUR_WIDTH)
        expect(getOverviewContentWidth(3000, 81, LEFT, false)).toBe(3000)
    })

    it('spans the time axis between the tick column and the right margin', () => {
        const frame = getOverviewFrame(TIMES, LEFT, 344, false)

        expect(frame.x(TIMES[0])).toBe(LEFT)
        expect(frame.x(TIMES[2])).toBe(336)
        expect(frame).toMatchObject({ stepMs: 3 * HOUR_MS, plotRight: 336, plotWidth: 300, slotWidth: 150 })
        expect(frame.barWidth).toBeCloseTo(150 * 0.62)
    })
})

describe('panel drawing', () => {
    const layout = getOverviewLayout(HEIGHTS, [...PANELS], true)
    const frame = getOverviewFrame(TIMES, LEFT, 344, false)
    const scales = layout.rows.map((row) => getPanelScale(row, SERIES))

    it('leaves a panel without values unlabelled', () => {
        const empty = { ...SERIES, [Variable.Temp]: { steps: SLOTS, values: [null, null, null] } }

        expect(scales[0].ticks.length).toBeGreaterThan(0)
        expect(getPanelScale(layout.rows[0], empty).ticks).toEqual([])
    })

    it('fits the wind panel to the gusts it also draws', () => {
        expect(scales[1].y.domain()[1]).toBe(10)
        expect(scales[1].y.range()).toEqual([layout.rows[1].bottom, layout.rows[1].top + 6])
    })

    it('draws a line panel as an area, a line and the dashed second line', () => {
        const paths = getPanelPaths(layout.rows[0], SERIES, frame.x, scales[0].y)

        expect(paths.area).toMatch(/^M36,/)
        expect(paths.line).toMatch(/^M36,/)
        expect(paths.secondary).toMatch(/^M36,/)
        expect(getPanelPaths(layout.rows[2], SERIES, frame.x, scales[2].y).secondary).toBeNull()
    })

    it('draws a bar for each amount that fits the plot, centred in the step after its slot', () => {
        const bars = getPanelBars(layout.rows[2], SERIES, frame.x, scales[2].y, frame)

        // The second slot has no amount; the third's bar would cover the 3 hours past the chart's end.
        expect(bars).toHaveLength(1)
        expect(bars[0].key).toBe(SLOTS[0])
        expect(bars[0].x + bars[0].width / 2).toBe(LEFT + 75)
        expect(bars[0].y + bars[0].height).toBe(layout.rows[2].bottom)
    })

    it('labels the chance of rain under the bars that fit, likely slots standing out', () => {
        expect(getChanceLabels([0.6, 0.2, 0.9], TIMES, frame.x, frame)).toEqual([
            { key: SLOTS[0], x: LEFT + 75, text: '60', isLikely: true },
            { key: SLOTS[1], x: LEFT + 225, text: '20', isLikely: false },
        ])
    })

    it('marks the hovered slot on every line panel and its second line, never on the bars', () => {
        const dots = getHoverDots(layout.rows, scales, SERIES, SLOTS[2])

        expect(dots.map((d) => [d.key, d.isSecondary])).toEqual([
            [Variable.Temp, false],
            [Variable.Wind, false],
            [`${Variable.Wind}-secondary`, true],
        ])
        expect(dots[0].cy).toBe(scales[0].y(18))
    })
})

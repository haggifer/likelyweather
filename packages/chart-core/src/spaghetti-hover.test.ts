import { HOUR_MS } from '@fa/shared/constants'
import { ModelId } from '@fa/shared/models'
import { getTimeScale } from './plot-geometry'
import { getDrawnBars } from './spaghetti-geometry'
import { getHoverLabel, getSpaghettiHover, getTooltipRows } from './spaghetti-hover'

const STEP_MS = 3 * HOUR_MS
const STEPS = ['2026-10-12T00:00:00.000Z', '2026-10-12T03:00:00.000Z', '2026-10-12T06:00:00.000Z']
const TIMES = STEPS.map((s) => new Date(s))
const MARGIN = { top: 24, right: 12, bottom: 30, left: 44 }
const x = getTimeScale(TIMES, [44, 344])

const getHover = (hoverIndex: number | null, isBars: boolean, visibleRange: [number, number] = [44, 344]) =>
    getSpaghettiHover({
        hoverIndex,
        steps: STEPS,
        times: TIMES,
        x,
        isBars,
        stepMs: STEP_MS,
        bars: isBars ? getDrawnBars(TIMES, x, STEP_MS, 20, [44, 344]) : [],
        visibleRange,
        margin: MARGIN,
        plotRight: 344,
        timeZone: 'UTC',
        locale: 'en',
    })

describe('getHoverLabel', () => {
    it('names a step, or the span of a sum', () => {
        expect(getHoverLabel(STEPS[1], null, 'UTC', 'en')).toBe('Mon 03:00')
        expect(getHoverLabel(STEPS[1], [TIMES[1], TIMES[2]], 'UTC', 'en')).toBe('Mon 03:00–06:00')
    })
})

describe('getTooltipRows', () => {
    it('lists the models with a value at the step, highest first', () => {
        const series = [
            { modelId: ModelId.Gfs, values: [1, 2, 3] },
            { modelId: ModelId.Gem, values: [4, null, 6] },
            { modelId: ModelId.EcmwfIfs, values: [0, 5, 1] },
        ]

        expect(getTooltipRows(series, 1)).toEqual([
            { modelId: ModelId.EcmwfIfs, value: 5 },
            { modelId: ModelId.Gfs, value: 2 },
        ])
    })
})

describe('getSpaghettiHover', () => {
    it('is nothing without a hovered step or past the data', () => {
        expect(getHover(null, false)).toBeNull()
        expect(getHover(5, false)).toBeNull()
    })

    it('puts the crosshair on a line step, with its time above', () => {
        expect(getHover(1, false)).toEqual({
            index: 1,
            x: 194,
            label: 'Mon 03:00',
            labelX: 194,
            shade: null,
            bar: undefined,
        })
    })

    it('shades a sum across the span it covers and labels its start and end', () => {
        const hover = getHover(0, true)

        expect(hover?.x).toBe(119)
        expect(hover?.label).toBe('Mon 00:00–03:00')
        expect(hover?.shade).toEqual({ left: 44, width: 150 })
        expect(hover?.bar).toEqual({ i: 0, center: 119 })
    })

    it('keeps the label clear of the unit over the axis and of the visible edge', () => {
        expect(getHover(0, false)?.labelX).toBe(44 + 28 + 34)
        expect(getHover(2, false, [44, 300])?.labelX).toBe(300 - 34)
    })
})

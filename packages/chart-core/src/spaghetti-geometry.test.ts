import snapshot from '@fa/fixtures/snapshot-kharkiv.json'
import { computeEnsemble } from '@fa/shared/ensemble'
import { ModelId } from '@fa/shared/models'
import { Variable } from '@fa/shared/variables'
import { getTimeScale } from './plot-geometry'
import { getYDomain, getYTicks } from './scales'
import {
    buildSpaghettiGeometry,
    getArrowRowY,
    getClipRect,
    getDrawnBars,
    getIndexRange,
    getNearestIndex,
    getPickedIndex,
    getSeriesYDomain,
    getSpaghettiHeight,
    getSpaghettiMargin,
    getSpaghettiTicks,
    getSpanIndex,
    getStepMs,
    getSumBarCenter,
    getSumSpan,
    getTickWidth,
} from './spaghetti-geometry'

// A real collector snapshot (Kharkiv, 2026-09-23 12:00 UTC) keeps the path data honest.
const series = Object.entries(snapshot.models).map(([modelId, s]) => ({ modelId: modelId as ModelId, values: s.temp }))
const stats = computeEnsemble(
    series.map((s) => s.values),
    snapshot.steps.length,
)
const margin = { top: 10, right: 10, bottom: 20, left: 40 }

describe('spaghetti geometry', () => {
    it('snaps the y domain to the variable gridline step', () => {
        const values = series.flatMap((s) => s.values)

        expect(getYDomain(values, Variable.Temp)).toEqual([5, 25])
        expect(getYTicks([5, 25], Variable.Temp, 5)).toEqual([5, 10, 15, 20, 25])
        expect(getYDomain([0.4, 7.1], Variable.Wind)).toEqual([0, 8])
        expect(getYTicks([0, 8], Variable.Wind, 5)).toEqual([0, 2, 4, 6, 8])
        expect(getYDomain([0.4, 3.1], Variable.Precip)[0]).toBe(0)
    })

    it('produces stable path data for lines, median and bands', () => {
        const geometry = buildSpaghettiGeometry({
            steps: snapshot.steps,
            series,
            stats,
            width: 600,
            height: 300,
            domain: getYDomain(
                series.flatMap((s) => s.values),
                Variable.Temp,
            ),
            margin,
        })

        expect({
            median: geometry.median,
            rangeBand: geometry.rangeBand,
            lines: geometry.lines,
        }).toMatchSnapshot()
    })

    it('centers a sum bar in the step after its slot', () => {
        const at = new Date('2026-09-24T12:00Z')

        expect(getSumBarCenter(at, 3 * 3_600_000).toISOString()).toBe('2026-09-24T13:30:00.000Z')
    })

    it('selects the sum whose span holds the pointer, not the nearest step', () => {
        const threeHours = 3 * 3_600_000
        const times = ['2026-09-26T04:00Z', '2026-09-26T07:00Z', '2026-09-26T10:00Z'].map((t) => new Date(t))

        // 09:30 is nearest the 10:00 step, but it lies in the bar that covers 07:00–10:00.
        expect(getSpanIndex(times, new Date('2026-09-26T09:30Z'), threeHours)).toBe(1)
        expect(getSpanIndex(times, new Date('2026-09-26T07:10Z'), threeHours)).toBe(1)
        expect(getSumSpan(times[1], threeHours).map((d) => d.toISOString())).toEqual([
            '2026-09-26T07:00:00.000Z',
            '2026-09-26T10:00:00.000Z',
        ])
    })

    it('snaps a time to the nearest 6-hour step', () => {
        const times = snapshot.steps.map((s) => new Date(s))

        expect(getNearestIndex(times, new Date('2026-09-23T14:00Z'))).toBe(
            times.findIndex((t) => t.toISOString() === '2026-09-23T12:00:00.000Z'),
        )
        expect(getNearestIndex(times, new Date('2030-01-01T00:00Z'))).toBe(times.length - 1)
    })
})

describe('spaghetti layout', () => {
    const threeHours = 3 * 3_600_000
    const times = ['2026-10-12T00:00Z', '2026-10-12T03:00Z', '2026-10-12T06:00Z'].map((t) => new Date(t))
    const x = getTimeScale(times, [44, 344])

    it('makes room for the wind arrows under the plot, and less around a compact chart', () => {
        expect(getSpaghettiMargin(false, true)).toEqual({ top: 24, right: 12, bottom: 56, left: 44 })
        expect(getSpaghettiMargin(true, false)).toEqual({ top: 14, right: 12, bottom: 22, left: 34 })
        expect(getArrowRowY(340)).toBe(325)
    })

    it('shortens the plot on a phone so the model list stays in view', () => {
        expect(getSpaghettiHeight(360, 340)).toBe(280)
        expect(getSpaghettiHeight(360, 200)).toBe(200)
        expect(getSpaghettiHeight(800, 340)).toBe(340)
    })

    it('fits the y domain to every model', () => {
        expect(getSeriesYDomain(series, Variable.Temp)).toEqual([5, 25])
    })

    it('labels the axis only when a model has values', () => {
        const pressure = [{ modelId: series[0].modelId, values: [1012, 1014] }]
        const domain = getSeriesYDomain([], Variable.Pressure)

        expect(getSpaghettiTicks(pressure, [], [1010, 1016], Variable.Pressure, 5)).toEqual(
            getYTicks([1010, 1016], Variable.Pressure, 5),
        )
        expect(getSpaghettiTicks([], [null, null], domain, Variable.Pressure, 5)).toEqual([])
        expect(
            getSpaghettiTicks([{ ...pressure[0], values: [null, null] }], [null, null], domain, Variable.Pressure, 5),
        ).toEqual([])
    })

    it('labels the chance of rain, which draws its median without model lines', () => {
        expect(getSpaghettiTicks([], [0, 33], [0, 100], Variable.Chance, 5)).toEqual([0, 25, 50, 75, 100])
    })

    it('reads the step from the data, and a 3-hour slot for a single step', () => {
        expect(getStepMs(times)).toBe(threeHours)
        expect(getStepMs(times.slice(0, 1))).toBe(threeHours)
    })

    it('caps a model tick at 16 px across a wide bar', () => {
        expect(getTickWidth(40)).toBe(16)
        expect(getTickWidth(9)).toBe(9)
    })

    it('draws only the bars that fit the plot, and keeps the selection on them', () => {
        const bars = getDrawnBars(times, x, threeHours, 20, [44, 344])

        expect(bars).toEqual([
            { i: 0, center: 119 },
            { i: 1, center: 269 },
        ])
        expect(getIndexRange(bars, true, times.length)).toEqual([0, 1])
        expect(getIndexRange([], false, times.length)).toEqual([0, 2])
        expect(getPickedIndex(times, new Date('2026-10-12T07:00Z'), threeHours, true, [0, 1])).toBe(1)
        expect(getPickedIndex(times, new Date('2026-10-12T05:00Z'), threeHours, false, [0, 2])).toBe(2)
    })

    it('clips past the plot by half the median stroke and a pixel', () => {
        expect(getClipRect({ top: 24, right: 12, bottom: 30, left: 44 }, 344, 310)).toEqual({
            x: 44,
            y: 21.5,
            width: 300,
            height: 291,
        })
    })
})

import snapshot from '@fa/fixtures/snapshot-kharkiv.json'
import { computeEnsemble } from '@fa/shared/ensemble'
import { ModelId } from '@fa/shared/models'
import { Variable } from '@fa/shared/variables'
import { getYDomain, getYTicks } from './scales'
import {
    buildSpaghettiGeometry,
    getNearestIndex,
    getSpanIndex,
    getSumBarCenter,
    getSumSpan,
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
            outerBand: geometry.outerBand,
            innerBand: geometry.innerBand,
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

import { buildSpaghettiGeometry, getNearestIndex, getYDomain } from '@/charts/spaghettiGeometry'
import snapshot from '@/fixtures/snapshot-kharkiv.json'
import { computeEnsemble } from '@/shared/ensemble'
import { ModelId } from '@/shared/models'

// A real collector snapshot (Kharkiv, 2026-09-23 12:00 UTC) keeps the path data honest.
const series = Object.entries(snapshot.models).map(([modelId, s]) => ({ modelId: modelId as ModelId, values: s.temp }))
const stats = computeEnsemble(
    series.map((s) => s.values),
    snapshot.steps.length,
)
const margin = { top: 10, right: 10, bottom: 20, left: 40 }

describe('spaghetti geometry', () => {
    it('pads and rounds the y domain', () => {
        expect(getYDomain(series, false)).toMatchSnapshot()
        expect(getYDomain([{ modelId: ModelId.Gfs, values: [0.4, 3.1] }], true)[0]).toBe(0)
    })

    it('produces stable path data for lines, median and bands', () => {
        const geometry = buildSpaghettiGeometry({
            steps: snapshot.steps,
            series,
            stats,
            width: 600,
            height: 300,
            domain: getYDomain(series, false),
            margin,
        })

        expect({
            median: geometry.median,
            outerBand: geometry.outerBand,
            innerBand: geometry.innerBand,
            lines: geometry.lines,
        }).toMatchSnapshot()
    })

    it('snaps a time to the nearest 6-hour step', () => {
        const times = snapshot.steps.map((s) => new Date(s))

        expect(getNearestIndex(times, new Date('2026-09-23T14:00Z'))).toBe(
            times.findIndex((t) => t.toISOString() === '2026-09-23T12:00:00.000Z'),
        )
        expect(getNearestIndex(times, new Date('2030-01-01T00:00Z'))).toBe(times.length - 1)
    })
})

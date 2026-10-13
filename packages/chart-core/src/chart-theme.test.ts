import { getChartColors } from './chart-theme'

describe('getChartColors', () => {
    it('reads every chart colour from its design token', () => {
        expect(getChartColors((token) => `var(--${token})`)).toEqual({
            foreground: 'var(--foreground)',
            muted: 'var(--muted-foreground)',
            border: 'var(--border)',
            card: 'var(--card)',
            grid: 'var(--chart-grid)',
            median: 'var(--chart-median)',
            band: 'var(--chart-band)',
        })
    })

    it('tells the reader which chart colour a token fills, for its fallback', () => {
        expect(getChartColors((_, key) => key).muted).toBe('muted')
    })
})

import { getColorMode } from '@fa/ui/lib/color-mode'
import { getChartThemeSnapshot } from './chart-theme-store'
import { readChartTheme } from './theme'

vi.mock('@fa/ui/lib/color-mode', () => ({ getColorMode: vi.fn(() => 'light') }))
vi.mock('./theme', () => ({
    FALLBACK_CHART_THEME: { median: 'fallback' },
    readChartTheme: vi.fn(() => ({ median: 'light-median' })),
}))

describe('getChartThemeSnapshot', () => {
    it('re-reads the CSS variables when the colour mode changed while no chart was listening', () => {
        expect(getChartThemeSnapshot()).toEqual({ median: 'light-median' })

        vi.mocked(getColorMode).mockReturnValue('dark')
        vi.mocked(readChartTheme).mockReturnValue({ median: 'dark-median' } as never)

        expect(getChartThemeSnapshot()).toEqual({ median: 'dark-median' })
    })

    it('keeps the same object while the mode is unchanged, so React sees a stable snapshot', () => {
        const first = getChartThemeSnapshot()
        const second = getChartThemeSnapshot()

        expect(second).toBe(first)
    })
})

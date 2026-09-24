import { getBestForeground, getContrastRatio } from '@/theme/contrast'
import { buildFrozenCss } from '@/theme/freeze'
import { PRESET_ORDER, PRESETS } from '@/theme/presets'
import { resolve } from '@/theme/resolve'
import { DEFAULT_STATE, getPresetState } from '@/theme/state'
import { PRESET_SENTINEL, PresetId } from '@/theme/tokens'

describe('contrast', () => {
    it('matches known WCAG ratios', () => {
        expect(getContrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5)
        expect(getContrastRatio('#FFFFFF', '#FFFFFF')).toBe(1)
        expect(getContrastRatio('#1E5EFF', '#FFFFFF')).toBeCloseTo(5.14, 1)
    })

    it('picks the readable foreground', () => {
        expect(getBestForeground('#0B1B33')).toBe('#FFFFFF')
        expect(getBestForeground('#FAF9F6')).toBe('#0A0A0A')
    })
})

describe('presets', () => {
    it.each(PRESET_ORDER)('%s passes text contrast in both modes', (id) => {
        for (const side of [PRESETS[id].light, PRESETS[id].dark]) {
            expect(getContrastRatio(side.foreground, side.background)).toBeGreaterThanOrEqual(4.5)
            expect(getContrastRatio(side.mutedForeground, side.card)).toBeGreaterThanOrEqual(4.5)
        }
    })
})

describe('resolve', () => {
    it('defaults to Sky light with preset fonts and attributes', () => {
        const resolved = resolve(DEFAULT_STATE, 'light')

        expect(resolved.vars['--primary']).toBe('#1E5EFF')
        expect(resolved.vars['--radius']).toBe('10px')
        expect(resolved.vars['--font-sans']).toContain('--font-inter')
        expect(resolved.attrs).toMatchObject({ density: 'comfortable', surface: 'elevated', bands: 'minmax-iqr' })
    })

    it('applies an accent override with a readable foreground', () => {
        const resolved = resolve({ ...getPresetState(PresetId.Console), accent: '#D97706' }, 'dark')

        expect(resolved.vars['--primary']).toBe('#D97706')
        expect(resolved.vars['--chart-band']).toBe('#D97706')
        expect(resolved.vars['--primary-foreground']).toBe('#0A0A0A')
    })

    it('keeps the preset accent with the sentinel', () => {
        expect(resolve({ ...DEFAULT_STATE, accent: PRESET_SENTINEL }, 'dark').vars['--primary']).toBe('#5B8CFF')
    })
})

describe('freeze', () => {
    it('emits :root and .dark blocks for globals.css', () => {
        const css = buildFrozenCss(getPresetState(PresetId.Metro))

        expect(css).toContain(':root {')
        expect(css).toContain('.dark {')
        expect(css).toContain('--radius: 0px;')
        expect(css).toContain('--border-width: 1.5px;')
    })
})

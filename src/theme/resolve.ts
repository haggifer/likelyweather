import { DENSITY_SPEC, FONT_STACKS } from '@/theme/axes'
import { getBestForeground } from '@/theme/contrast'
import { PRESETS } from '@/theme/presets'
import { ColorSide, FontName, Mode, ModeSetting, PRESET_SENTINEL, SANS_SENTINEL, ThemeState } from '@/theme/tokens'

export interface ResolvedTheme {
    vars: Record<string, string>
    attrs: Record<string, string>
    mode: Mode
    side: ColorSide
}

export const resolveMode = (setting: ModeSetting): Mode => {
    if (setting !== 'system') return setting

    if (typeof window === 'undefined' || !window.matchMedia) return 'light'

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const getFontStack = (name: string) => FONT_STACKS[name as FontName] ?? name

export const resolveFonts = (state: ThemeState) => {
    const { meta } = PRESETS[state.preset]
    const sans = state.sans === PRESET_SENTINEL ? meta.sans : state.sans
    const heading =
        state.heading === PRESET_SENTINEL ? meta.heading : state.heading === SANS_SENTINEL ? sans : state.heading
    const mono = state.mono === PRESET_SENTINEL ? meta.mono : state.mono

    return { sans: getFontStack(sans), heading: getFontStack(heading), mono: getFontStack(mono) }
}

const applyAccent = (base: ColorSide, accent: string): ColorSide => {
    if (accent === PRESET_SENTINEL) return base

    return { ...base, primary: accent, ring: accent, band: accent, primaryForeground: getBestForeground(accent) }
}

export const resolve = (state: ThemeState, forceMode?: Mode): ResolvedTheme => {
    const preset = PRESETS[state.preset]
    const mode = forceMode ?? resolveMode(state.mode)
    const side = applyAccent(preset[mode], state.accent)
    const fonts = resolveFonts(state)
    const density = DENSITY_SPEC[state.density]
    const [outer, inner] = preset.meta.bandOpacity

    const vars: Record<string, string> = {
        '--background': side.background,
        '--foreground': side.foreground,
        '--card': side.card,
        '--card-foreground': side.foreground,
        '--popover': side.popover,
        '--popover-foreground': side.foreground,
        '--primary': side.primary,
        '--primary-foreground': side.primaryForeground,
        '--secondary': side.secondary,
        '--secondary-foreground': side.secondaryForeground,
        '--muted': side.muted,
        '--muted-foreground': side.mutedForeground,
        '--accent': side.accent,
        '--accent-foreground': side.accentForeground,
        '--destructive': side.destructive,
        '--border': side.border,
        '--input': side.input,
        '--ring': side.ring,
        '--info': side.info,
        '--warning': side.warning,
        '--success': side.success,
        '--code-background': side.codeBackground,
        '--chart-1': side.charts[0],
        '--chart-2': side.charts[1],
        '--chart-3': side.charts[2],
        '--chart-4': side.charts[3],
        '--chart-5': side.charts[4],
        '--chart-median': side.median,
        '--chart-band': side.band,
        '--chart-grid': side.grid,
        '--band-outer-opacity': String(outer),
        '--band-inner-opacity': String(inner),
        '--font-sans': fonts.sans,
        '--font-heading': fonts.heading,
        '--font-mono': fonts.mono,
        '--text-base': `${state.textBase}px`,
        '--radius': `${state.radius}px`,
        '--border-width': `${preset.meta.borderWidth}px`,
        '--row-height': `${density.rowHeight}px`,
        '--pane-padding': `${density.panePadding}px`,
        '--card-padding': `${density.cardPadding}px`,
        '--card-gap': `${density.cardGap}px`,
        '--topbar-h': `${density.topbar}px`,
    }

    return {
        vars,
        attrs: {
            density: state.density,
            surface: state.surface,
            chips: state.chips,
            bands: state.bands,
            heatmap: state.heatmap,
            legend: state.legend,
            sourceline: preset.meta.sourceLine ? 'on' : 'off',
        },
        mode,
        side,
    }
}

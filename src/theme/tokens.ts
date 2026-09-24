export type Mode = 'light' | 'dark'
export type ModeSetting = Mode | 'system'
export type Density = 'compact' | 'comfortable' | 'spacious'
export type Surface = 'flat' | 'bordered' | 'elevated'
export type ChipStyle = 'filled' | 'outline' | 'dot'
export type BandStyle = 'minmax-iqr' | 'iqr' | 'none'
export type HeatmapScale = 'blues' | 'viridis' | 'grays'
export type LegendPlacement = 'side' | 'under'

export enum PresetId {
    Sky = 'sky',
    Console = 'console',
    Civic = 'civic',
    Swiss = 'swiss',
    Metro = 'metro',
}

export enum FontName {
    Inter = 'Inter',
    IbmPlexSans = 'IBM Plex Sans',
    PublicSans = 'Public Sans',
    GeistSans = 'Geist Sans',
    SpaceGrotesk = 'Space Grotesk',
    LibreBodoni = 'Libre Bodoni',
    JetBrainsMono = 'JetBrains Mono',
    GeistMono = 'Geist Mono',
    IbmPlexMono = 'IBM Plex Mono',
    SpaceMono = 'Space Mono',
}

export interface ColorSide {
    background: string
    foreground: string
    card: string
    popover: string
    primary: string
    primaryForeground: string
    secondary: string
    secondaryForeground: string
    muted: string
    mutedForeground: string
    accent: string
    accentForeground: string
    destructive: string
    border: string
    input: string
    ring: string
    info: string
    warning: string
    success: string
    codeBackground: string
    charts: [string, string, string, string, string]
    median: string
    band: string
    grid: string
}

export interface PresetMeta {
    sans: FontName
    heading: FontName
    mono: FontName
    radius: number
    density: Density
    surface: Surface
    chips: ChipStyle
    bands: BandStyle
    heatmap: HeatmapScale
    borderWidth: number
    bandOpacity: [number, number]
    sourceLine: boolean
}

export interface Preset {
    id: PresetId
    name: string
    tag: string
    defaultMode: Mode
    light: ColorSide
    dark: ColorSide
    meta: PresetMeta
}

export type TextBase = 13 | 14 | 15

export interface ThemeState {
    preset: PresetId
    mode: ModeSetting
    accent: string
    sans: string
    heading: string
    mono: string
    textBase: TextBase
    radius: number
    density: Density
    surface: Surface
    bands: BandStyle
    heatmap: HeatmapScale
    chips: ChipStyle
    legend: LegendPlacement
}

export const PRESET_SENTINEL = '__preset__'
export const SANS_SENTINEL = '__sans__'

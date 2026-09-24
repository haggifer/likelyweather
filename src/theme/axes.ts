import { BandStyle, Density, FontName, HeatmapScale, LegendPlacement, Surface, TextBase } from '@/theme/tokens'

export const FONT_STACKS: Record<FontName, string> = {
    [FontName.Inter]: 'var(--font-inter), system-ui, sans-serif',
    [FontName.IbmPlexSans]: 'var(--font-ibm-plex-sans), system-ui, sans-serif',
    [FontName.PublicSans]: 'var(--font-public-sans), system-ui, sans-serif',
    [FontName.GeistSans]: 'var(--font-geist-sans), system-ui, sans-serif',
    [FontName.SpaceGrotesk]: 'var(--font-space-grotesk), system-ui, sans-serif',
    [FontName.LibreBodoni]: 'var(--font-libre-bodoni), Georgia, serif',
    [FontName.JetBrainsMono]: 'var(--font-jetbrains-mono), ui-monospace, monospace',
    [FontName.GeistMono]: 'var(--font-geist-mono), ui-monospace, monospace',
    [FontName.IbmPlexMono]: 'var(--font-ibm-plex-mono), ui-monospace, monospace',
    [FontName.SpaceMono]: 'var(--font-space-mono), ui-monospace, monospace',
}

export interface AccentOption {
    key: string
    label: string
}

export const ACCENTS: AccentOption[] = [
    { key: '#16A34A', label: 'Green' },
    { key: '#1E5EFF', label: 'Blue' },
    { key: '#D97706', label: 'Amber' },
    { key: '#E4572E', label: 'Coral' },
    { key: '#0D9488', label: 'Teal' },
    { key: '#7C3AED', label: 'Violet' },
]

export const SANS_OPTIONS: FontName[] = [
    FontName.Inter,
    FontName.IbmPlexSans,
    FontName.PublicSans,
    FontName.GeistSans,
    FontName.SpaceGrotesk,
]
export const HEADING_OPTIONS: FontName[] = [FontName.LibreBodoni, FontName.SpaceGrotesk, FontName.Inter]
export const MONO_OPTIONS: FontName[] = [
    FontName.JetBrainsMono,
    FontName.GeistMono,
    FontName.IbmPlexMono,
    FontName.SpaceMono,
]

export const TEXT_SIZES: TextBase[] = [13, 14, 15]
export const RADII = [0, 4, 6, 8, 10, 12]
export const DENSITIES: Density[] = ['compact', 'comfortable', 'spacious']
export const SURFACES: Surface[] = ['flat', 'bordered', 'elevated']
export const BAND_STYLES: BandStyle[] = ['minmax-iqr', 'iqr', 'none']
export const HEATMAP_SCALES: HeatmapScale[] = ['blues', 'viridis', 'grays']
export const LEGEND_PLACEMENTS: LegendPlacement[] = ['side', 'under']

export interface DensitySpec {
    rowHeight: number
    panePadding: number
    cardPadding: number
    cardGap: number
    topbar: number
}

export const DENSITY_SPEC: Record<Density, DensitySpec> = {
    compact: { rowHeight: 30, panePadding: 12, cardPadding: 12, cardGap: 10, topbar: 48 },
    comfortable: { rowHeight: 36, panePadding: 20, cardPadding: 16, cardGap: 16, topbar: 56 },
    spacious: { rowHeight: 42, panePadding: 28, cardPadding: 22, cardGap: 22, topbar: 64 },
}

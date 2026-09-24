import { PRESETS } from '@/theme/presets'
import { PRESET_SENTINEL, PresetId, ThemeState } from '@/theme/tokens'

export const getPresetState = (id: PresetId): ThemeState => {
    const { meta, defaultMode } = PRESETS[id]

    return {
        preset: id,
        mode: defaultMode,
        accent: PRESET_SENTINEL,
        sans: PRESET_SENTINEL,
        heading: PRESET_SENTINEL,
        mono: PRESET_SENTINEL,
        textBase: 14,
        radius: meta.radius,
        density: meta.density,
        surface: meta.surface,
        bands: meta.bands,
        heatmap: meta.heatmap,
        chips: meta.chips,
        legend: 'side',
    }
}

export const DEFAULT_STATE: ThemeState = getPresetState(PresetId.Sky)

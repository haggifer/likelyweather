import { civic } from '@/theme/presets/civic'
import { consolePreset } from '@/theme/presets/console'
import { metro } from '@/theme/presets/metro'
import { sky } from '@/theme/presets/sky'
import { swiss } from '@/theme/presets/swiss'
import { Preset, PresetId } from '@/theme/tokens'

export const PRESETS: Record<PresetId, Preset> = {
    [PresetId.Sky]: sky,
    [PresetId.Console]: consolePreset,
    [PresetId.Civic]: civic,
    [PresetId.Swiss]: swiss,
    [PresetId.Metro]: metro,
}

export const PRESET_ORDER: PresetId[] = [PresetId.Sky, PresetId.Console, PresetId.Civic, PresetId.Swiss, PresetId.Metro]

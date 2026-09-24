// Prints the frozen :root/.dark CSS for a Theme Lab combination, to freeze a chosen design into globals.css.
// Usage: pnpm theme:export [--preset sky|console|civic|swiss|metro] [--state combination.json]
import { buildFrozenCss } from '@/theme/freeze'
import { DEFAULT_STATE, getPresetState } from '@/theme/state'
import { PresetId, ThemeState } from '@/theme/tokens'
import { readFileSync } from 'node:fs'
import { parseArgs } from 'node:util'

const { values } = parseArgs({
    args: process.argv.slice(2).filter((arg) => arg !== '--'),
    options: { preset: { type: 'string' }, state: { type: 'string' } },
})

const getState = (): ThemeState => {
    if (values.state) return { ...DEFAULT_STATE, ...(JSON.parse(readFileSync(values.state, 'utf8')) as ThemeState) }

    if (values.preset) {
        if (!Object.values(PresetId).includes(values.preset as PresetId)) {
            throw new Error(`Unknown preset "${values.preset}". Use one of: ${Object.values(PresetId).join(', ')}`)
        }

        return getPresetState(values.preset as PresetId)
    }

    return DEFAULT_STATE
}

console.log(buildFrozenCss(getState()))

import { PRESETS } from '@/theme/presets'
import { resolve } from '@/theme/resolve'
import { ThemeState } from '@/theme/tokens'

const MODE_KEYS = [
    '--background',
    '--foreground',
    '--card',
    '--card-foreground',
    '--popover',
    '--popover-foreground',
    '--primary',
    '--primary-foreground',
    '--secondary',
    '--secondary-foreground',
    '--muted',
    '--muted-foreground',
    '--accent',
    '--accent-foreground',
    '--destructive',
    '--border',
    '--input',
    '--ring',
    '--info',
    '--warning',
    '--success',
    '--code-background',
    '--chart-1',
    '--chart-2',
    '--chart-3',
    '--chart-4',
    '--chart-5',
    '--chart-median',
    '--chart-band',
    '--chart-grid',
]

const SHARED_KEYS = [
    '--band-outer-opacity',
    '--band-inner-opacity',
    '--font-sans',
    '--font-heading',
    '--font-mono',
    '--text-base',
    '--radius',
    '--border-width',
]

const toBlock = (vars: Record<string, string>, keys: string[]) => keys.map((k) => `    ${k}: ${vars[k]};`).join('\n')

// The §4.6 freeze output: paste into globals.css and set the <html> data attributes in the root layout.
export const buildFrozenCss = (state: ThemeState) => {
    const light = resolve(state, 'light')
    const dark = resolve(state, 'dark')
    const attrs = Object.entries(light.attrs)
        .map(([k, v]) => `data-${k}="${v}"`)
        .join(' ')

    return [
        `/* Forecast Arena — frozen theme: ${PRESETS[state.preset].name} (default mode ${state.mode}) */`,
        `/* <html ${attrs}> */`,
        `:root {\n${toBlock(light.vars, MODE_KEYS)}\n${toBlock(light.vars, SHARED_KEYS)}\n}`,
        `.dark {\n${toBlock(dark.vars, MODE_KEYS)}\n}`,
    ].join('\n\n')
}

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { parseCssTokens } from './css-tokens'
import { DARK, LIGHT, RADIUS } from './tokens'

const CSS = `
:root {
    --background: #f7f9fc;
    --primary: #1E5EFF;
    --font-sans: var(--font-inter), system-ui, sans-serif;
    --radius: 0.625rem;
}
.dark {
    --background: #0b1220;
    --primary: #5b8cff;
}
:root {
    --row-height: 2.25rem;
}
`

describe('parseCssTokens', () => {
    it('reads the light and dark colours and the radius in px', () => {
        expect(parseCssTokens(CSS)).toEqual({
            light: { background: '#f7f9fc', primary: '#1e5eff' },
            dark: { background: '#0b1220', primary: '#5b8cff' },
            radius: 10,
        })
    })

    it('matches the committed tokens, so a globals.css change needs `pnpm --filter @fa/mobile tokens`', () => {
        const css = readFileSync(path.resolve(__dirname, '../../../web/src/app/globals.css'), 'utf8')

        expect({ light: LIGHT, dark: DARK, radius: RADIUS }).toEqual(parseCssTokens(css))
    })
})

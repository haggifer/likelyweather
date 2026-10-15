import { readFileSync } from 'node:fs'
import path from 'node:path'
import { parseCssTokens, toUniwindCss } from './css-tokens'
import { DARK, LIGHT, RADIUS } from './tokens'

const CSS = `
:root {
    --background: #f7f9fc;
    --primary: #1E5EFF;
    --font-sans: var(--font-inter), system-ui, sans-serif;
    --text-base: 0.875rem;
    --radius: 0.625rem;
    --shadow-card:
        0 1px 2px rgb(15 23 42 / 0.06),
        0 8px 24px -12px rgb(15 23 42 / 0.18);
}
.dark {
    --background: #0b1220;
    --primary: #5b8cff;
    --shadow-card: 0 1px 2px rgb(0 0 0 / 0.4);
}
:root {
    --row-height: 2.25rem;
}
`

describe('parseCssTokens', () => {
    it('reads the light and dark colours and shadows, the radius and the text sizes in px', () => {
        expect(parseCssTokens(CSS)).toEqual({
            light: { background: '#f7f9fc', primary: '#1e5eff' },
            dark: { background: '#0b1220', primary: '#5b8cff' },
            radius: 10,
            text: { 'text-base': 14 },
            shadows: {
                light: { 'shadow-card': '0 1px 2px rgba(15, 23, 42, 0.06), 0 8px 24px -12px rgba(15, 23, 42, 0.18)' },
                dark: { 'shadow-card': '0 1px 2px rgba(0, 0, 0, 0.4)' },
            },
        })
    })

    it('matches the committed tokens, so a globals.css change needs `pnpm --filter @fa/mobile tokens`', () => {
        const css = readFileSync(path.resolve(__dirname, '../../../web/src/app/globals.css'), 'utf8')

        const { light, dark, radius } = parseCssTokens(css)

        expect({ light: LIGHT, dark: DARK, radius: RADIUS }).toEqual({ light, dark, radius })
    })

    it('writes the light and dark colours, the radius scale and the text sizes as the Uniwind theme', () => {
        const css = toUniwindCss(parseCssTokens(CSS))

        expect(css).toContain('--radius-lg: 10px;')
        expect(css).toContain('--text-base: 14px;')
        expect(css).toMatch(/@variant dark \{[^}]*--shadow-card: 0 1px 2px rgba\(0, 0, 0, 0\.4\);/)
        expect(css).toMatch(/@variant light \{\s*--color-background: #f7f9fc;\s*--color-primary: #1e5eff;/)
        expect(css).toMatch(/@variant dark \{\s*--color-background: #0b1220;\s*--color-primary: #5b8cff;/)
    })

    it('matches the committed app theme, so a globals.css change needs `pnpm --filter @fa/mobile tokens`', () => {
        const web = readFileSync(path.resolve(__dirname, '../../../web/src/app/globals.css'), 'utf8')
        const app = readFileSync(path.resolve(__dirname, '../global.css'), 'utf8')

        expect(app).toBe(toUniwindCss(parseCssTokens(web)))
    })
})

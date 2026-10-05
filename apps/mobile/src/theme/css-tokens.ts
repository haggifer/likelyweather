export interface CssTokens {
    light: Record<string, string>
    dark: Record<string, string>
    radius: number
}

const ROOT_FONT_PX = 16
const HEX_DECLARATION = /--([\w-]+):\s*(#[0-9a-f]{3,8})\s*;/gi
const RADIUS_DECLARATION = /--radius:\s*([\d.]+)rem\s*;/

// The first `:root { … }` block holds the light tokens and `.dark { … }` the dark ones; later `:root` blocks hold
// layout sizes the app does not take from CSS.
const getBlock = (css: string, selector: string) => {
    const start = css.indexOf(`${selector} {`)

    return start === -1 ? '' : css.slice(start, css.indexOf('}', start))
}

const getColors = (block: string) =>
    Object.fromEntries([...block.matchAll(HEX_DECLARATION)].map(([, name, value]) => [name, value.toLowerCase()]))

export const parseCssTokens = (css: string): CssTokens => {
    const light = getBlock(css, ':root')
    const radiusRem = Number(RADIUS_DECLARATION.exec(light)?.[1] ?? 0)

    return { light: getColors(light), dark: getColors(getBlock(css, '.dark')), radius: radiusRem * ROOT_FONT_PX }
}

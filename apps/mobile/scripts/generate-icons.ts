import { writeFileSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { LIGHT } from '../src/theme/tokens'

// `logo` is the web header's mark, `filled` the splash's white cloud before a warm sun, `monochrome` the outline
// Android tints with the theme.
type MarkStyle = 'logo' | 'filled' | 'monochrome'

const SIZE = 1024
const IMAGES = path.resolve(import.meta.dirname, '../assets/images')
const IOS_ICON = path.resolve(import.meta.dirname, '../assets/expo.icon')
const SUN = '#ffc83d'
const CLOUD = '#ffffff'
const ICON_BACKGROUND = '#ffffff'
// The web header draws the logo with a stroke of 1.75 (`TopBar`), the other marks keep lucide's default 2.
const LOGO_STROKE_WIDTH = 1.75
const STROKE_WIDTH = 2

// The web's logo, lucide's `cloud-sun` on its 24-unit grid: the rays and the sun's arc, then the cloud.
const SUN_PATHS = [
    'M12 2v2',
    'm4.93 4.93 1.41 1.41',
    'M20 12h2',
    'm19.07 4.93-1.41 1.41',
    'M15.947 12.65a4 4 0 0 0-5.925-4.128',
]
const CLOUD_PATH = 'M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z'

const COLORS: Record<MarkStyle, { sun: string; cloud: string; fill: string }> = {
    logo: { sun: LIGHT.primary, cloud: LIGHT.primary, fill: 'none' },
    filled: { sun: SUN, cloud: CLOUD, fill: CLOUD },
    monochrome: { sun: CLOUD, cloud: CLOUD, fill: 'none' },
}

const toSvg = (body: string, size = SIZE) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${SIZE} ${SIZE}">${body}</svg>`

// The drawing spans 2–22 on both axes, so its centre (12, 12) goes to the canvas centre.
const getMarkTransform = (width: number) => {
    const scale = width / 20
    const offset = SIZE / 2 - 12 * scale

    return `translate(${offset} ${offset}) scale(${scale})`
}

const getMark = (width: number, style: MarkStyle) => {
    const { sun, cloud, fill } = COLORS[style]
    const strokeWidth = style === 'logo' ? LOGO_STROKE_WIDTH : STROKE_WIDTH
    const rays = SUN_PATHS.map((d) => `<path d="${d}" stroke="${sun}" />`).join('')

    return `<g transform="${getMarkTransform(width)}" fill="none" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
    ${rays}
    <path d="${CLOUD_PATH}" stroke="${cloud}" fill="${fill}" />
</g>`
}

const BACKGROUND = `<rect width="${SIZE}" height="${SIZE}" fill="${ICON_BACKGROUND}" />`

const writePng = (name: string, svg: string) => sharp(Buffer.from(svg)).png().toFile(path.join(IMAGES, name))

// Adaptive icons crop to the middle 66 of 108 dp, so their mark stays inside that circle; the legacy icon fills more.
const main = async () => {
    await writePng('icon.png', toSvg(BACKGROUND + getMark(600, 'logo')))
    await writePng('android-icon-background.png', toSvg(BACKGROUND))
    await writePng('android-icon-foreground.png', toSvg(getMark(500, 'logo')))
    await writePng('android-icon-monochrome.png', toSvg(getMark(500, 'monochrome')))
    await writePng('splash-icon.png', toSvg(getMark(760, 'filled'), 512))

    writeFileSync(path.join(IOS_ICON, 'Assets', 'cloud-sun.svg'), toSvg(getMark(600, 'logo')))
}

void main()

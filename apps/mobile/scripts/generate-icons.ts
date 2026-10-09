import { writeFileSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { LIGHT } from '../src/theme/tokens'

interface MarkOptions {
    // Width of the mark's 20-unit drawing on a 1024 px canvas.
    width: number
    isMonochrome?: boolean
    hasShadow?: boolean
}

const SIZE = 1024
const IMAGES = path.resolve(import.meta.dirname, '../assets/images')
const IOS_ICON = path.resolve(import.meta.dirname, '../assets/expo.icon')
const SUN = '#ffc83d'
const CLOUD = '#ffffff'
const GRADIENT_TOP = '#5b8cff'
const GRADIENT_BOTTOM = '#1446d6'

// The web's logo, lucide's `cloud-sun` on its 24-unit grid: the rays and the sun's arc, then the cloud.
const SUN_PATHS = [
    'M12 2v2',
    'm4.93 4.93 1.41 1.41',
    'M20 12h2',
    'm19.07 4.93-1.41 1.41',
    'M15.947 12.65a4 4 0 0 0-5.925-4.128',
]
const CLOUD_PATH = 'M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z'

const toSvg = (body: string, size = SIZE) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${SIZE} ${SIZE}">${body}</svg>`

// The drawing spans 2–22 on both axes, so its centre (12, 12) goes to the canvas centre.
const getMarkTransform = (width: number) => {
    const scale = width / 20
    const offset = SIZE / 2 - 12 * scale

    return `translate(${offset} ${offset}) scale(${scale})`
}

const SHADOW_FILTER = `<filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
    <feGaussianBlur in="SourceAlpha" stdDeviation="0.6" />
    <feOffset dy="0.5" />
    <feComponentTransfer><feFuncA type="linear" slope="0.35" /></feComponentTransfer>
    <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
</filter>`

// A filled cloud before a warm sun; the monochrome icon keeps the outline, which Android tints with the theme.
const getMark = ({ width, isMonochrome = false, hasShadow = false }: MarkOptions) => {
    const sunColor = isMonochrome ? CLOUD : SUN
    const cloudFill = isMonochrome ? 'none' : CLOUD
    const rays = SUN_PATHS.map((d) => `<path d="${d}" stroke="${sunColor}" />`).join('')

    return `${hasShadow ? `<defs>${SHADOW_FILTER}</defs>` : ''}
<g transform="${getMarkTransform(width)}" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${hasShadow ? ' filter="url(#shadow)"' : ''}>
    ${rays}
    <path d="${CLOUD_PATH}" stroke="${CLOUD}" fill="${cloudFill}" />
</g>`
}

// The primary blue as a diagonal gradient, with a soft light from the top left.
const BACKGROUND = `<defs>
    <linearGradient id="tile" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${GRADIENT_TOP}" />
        <stop offset="0.55" stop-color="${LIGHT.primary}" />
        <stop offset="1" stop-color="${GRADIENT_BOTTOM}" />
    </linearGradient>
    <radialGradient id="light" cx="0.25" cy="0.15" r="0.75">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0.3" />
        <stop offset="1" stop-color="#ffffff" stop-opacity="0" />
    </radialGradient>
</defs>
<rect width="${SIZE}" height="${SIZE}" fill="url(#tile)" />
<rect width="${SIZE}" height="${SIZE}" fill="url(#light)" />`

const writePng = (name: string, svg: string) => sharp(Buffer.from(svg)).png().toFile(path.join(IMAGES, name))

// Adaptive icons crop to the middle 66 of 108 dp, so their mark stays inside that circle; the legacy icon fills more.
const main = async () => {
    await writePng('icon.png', toSvg(BACKGROUND + getMark({ width: 600, hasShadow: true })))
    await writePng('android-icon-background.png', toSvg(BACKGROUND))
    await writePng('android-icon-foreground.png', toSvg(getMark({ width: 500, hasShadow: true })))
    await writePng('android-icon-monochrome.png', toSvg(getMark({ width: 500, isMonochrome: true })))
    await writePng('splash-icon.png', toSvg(getMark({ width: 760 }), 512))

    writeFileSync(path.join(IOS_ICON, 'Assets', 'cloud-sun.svg'), toSvg(getMark({ width: 600 })))
}

void main()

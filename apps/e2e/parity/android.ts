import { execFileSync } from 'node:child_process'
import type { Rect, TextNode } from './types.ts'

interface Display {
    width: number
    height: number
    // Device pixels per dp: the app's layout unit, which the web page gets as its CSS pixel.
    scale: number
}

interface AndroidPage {
    png: Buffer
    nodes: TextNode[]
}

const DUMP_PATH = '/sdcard/fa-parity.xml'
const MAX_CAPTURE_ATTEMPTS = 4
// The gesture bar's strip at the screen's bottom, in dp: a text under its pill is measured on the next page instead.
const NAVIGATION_BAR_DP = 32
const NODE = /<node ([^>]*?)\/?>/g
const BOUNDS = /^\[(\d+),(\d+)\]\[(\d+),(\d+)\]$/
const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }

const toText = (value: string) =>
    value.replace(/&(#x?[\da-f]+|\w+);/gi, (match, code: string) => {
        if (code.startsWith('#')) {
            return String.fromCodePoint(code[1] === 'x' ? parseInt(code.slice(2), 16) : Number(code.slice(1)))
        }

        return ENTITIES[code] ?? match
    })

const getAttribute = (attributes: string, name: string) => new RegExp(` ${name}="([^"]*)"`).exec(` ${attributes}`)?.[1]

const toRect = (bounds: string): Rect | null => {
    const match = BOUNDS.exec(bounds)

    if (!match) {
        return null
    }

    const [left, top, right, bottom] = match.slice(1).map(Number)

    return { x: left, y: top, width: right - left, height: bottom - top }
}

const parseTextNodes = (xml: string, image: number): TextNode[] =>
    [...xml.matchAll(NODE)].flatMap(([, attributes]) => {
        const text = toText(getAttribute(attributes, 'text') ?? '').trim()
        const rect = toRect(getAttribute(attributes, 'bounds') ?? '')

        return text && rect && rect.width > 0 && rect.height > 0 ? [{ text, rect, image }] : []
    })

export const createAndroid = (device: string) => {
    const adb = (...args: string[]) => execFileSync('adb', ['-s', device, ...args], { maxBuffer: 64 * 1024 * 1024 })
    const shell = (...args: string[]) => adb('shell', ...args).toString('utf8')

    const getDisplay = (): Display => {
        const size = /(\d+)x(\d+)\s*$/.exec(shell('wm', 'size').trim())
        const density = /(\d+)\s*$/.exec(shell('wm', 'density').trim())

        if (!size || !density) {
            throw new Error(`Could not read the display of ${device}`)
        }

        return { width: Number(size[1]), height: Number(size[2]), scale: Number(density[1]) / 160 }
    }

    // A fresh task (NEW_TASK | CLEAR_TASK): a link into a running app would push the screen onto whatever is open, so
    // Home would gain a back arrow over a second Home. The development build loads its bundle again, which takes the
    // run's `--wait`.
    const open = (url: string) => {
        shell('am', 'start', '-f', '0x10008000', '-a', 'android.intent.action.VIEW', '-d', `'${url}'`)
    }

    // The view dump and the screenshot must show the same frame: a list still gliding after a drag would put each
    // text's bounds over another one's pixels, so a capture counts only when the screen did not change around it.
    const capture = (image: number, { height, scale }: Display): AndroidPage => {
        const isAboveNavigationBar = (node: TextNode) =>
            node.rect.y + node.rect.height <= height - NAVIGATION_BAR_DP * scale

        for (let attempt = 1; ; attempt++) {
            const before = adb('exec-out', 'screencap', '-p')
            shell('uiautomator', 'dump', DUMP_PATH)
            const xml = adb('exec-out', 'cat', DUMP_PATH).toString('utf8')
            const png = adb('exec-out', 'screencap', '-p')

            if (before.equals(png) || attempt === MAX_CAPTURE_ATTEMPTS) {
                return { png, nodes: parseTextNodes(xml, image).filter(isAboveNavigationBar) }
            }

            shell('sleep', '1')
        }
    }

    // A slow drag, so the list scrolls by about the drag's length instead of flinging.
    const drag = ({ width, height }: Display, x: number, from: number, to: number, ms: number) => {
        const left = String(Math.round(width * x))

        shell(
            'input',
            'swipe',
            left,
            String(Math.round(height * from)),
            left,
            String(Math.round(height * to)),
            String(ms),
        )
    }

    const scrollDown = (display: Display, x: number) => drag(display, x, 0.75, 0.35, 900)

    // Fast flings back up: opening a link to the screen already shown keeps where it was scrolled to.
    const scrollToTop = (display: Display, x: number) => {
        for (let i = 0; i < 4; i++) {
            drag(display, x, 0.3, 0.9, 150)
        }
    }

    const wait = (seconds: number) => {
        shell('sleep', String(seconds))
    }

    return { getDisplay, open, capture, scrollDown, scrollToTop, wait }
}

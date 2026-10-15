import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'
import type { PNG } from 'pngjs'
import { createAndroid } from './android.ts'
import { buildSheet, buildSideBySide, decodePng, getInkBox } from './ink.ts'
import { pairNodes, placeWebNodes, stitchPages } from './stitch.ts'
import type { Rect, TextNode } from './types.ts'
import { captureWeb } from './web.ts'

type Screen = 'home' | 'city' | 'archive'

interface Measurement {
    text: string
    // Ink width and height in dp (the app) and CSS px (the web), which are the same unit at the phone's width.
    web: { width: number; height: number }
    app: { width: number; height: number }
    widthDelta: number
    heightDelta: number
    isDifferent: boolean
    webRect: Rect
    appNode: TextNode
}

// Chrome and Android rasterise the same font slightly differently, so smaller gaps are noise, not a different size.
const WIDTH_TOLERANCE = 0.03
const HEIGHT_TOLERANCE = 1
const MAX_PAGES = 8
// The share of the screen's height one drag scrolls (android.ts), used where no text tells the real distance.
const SCROLL_SHARE = 0.4
const MAX_SHEET_ROWS = 60
const HELP = `Compares one screen of the web's phone layout with the same screen of the Android app.

pnpm --filter @fa/e2e parity --screen city --slug <slug> [options]

  --screen   home | city | archive (default home)
  --slug     a stored city's slug (needed for city and archive)
  --web      the web app's origin (default http://localhost:3000)
  --device   the adb device (default emulator-5554)
  --mode     light | dark: the web's colour mode; set the app's theme to match in its Settings (default dark)
  --wait     seconds both apps get to load (default 6)
  --scroll-x where the app is dragged to scroll, as a share of its width (default 0.5)
  --out      the results folder (default apps/e2e/parity-results)`

// pnpm hands a separating `--` on to the script, so `pnpm … parity -- --screen city` works as well.
const { values } = parseArgs({
    args: process.argv.slice(2).filter((arg) => arg !== '--'),
    options: {
        screen: { type: 'string', default: 'home' },
        slug: { type: 'string' },
        web: { type: 'string', default: 'http://localhost:3000' },
        device: { type: 'string', default: 'emulator-5554' },
        mode: { type: 'string', default: 'dark' },
        wait: { type: 'string', default: '6' },
        'scroll-x': { type: 'string', default: '0.5' },
        out: { type: 'string', default: path.resolve(import.meta.dirname, '../parity-results') },
        help: { type: 'boolean', default: false },
    },
})

const getPaths = (screen: Screen, slug: string | undefined) => {
    if (screen !== 'home' && !slug) {
        throw new Error(`--screen ${screen} needs --slug`)
    }

    switch (screen) {
        case 'home':
            return { web: '/', app: 'forecastarena://' }
        case 'city':
            return { web: `/city/${slug}`, app: `forecastarena://city/${slug}` }
        case 'archive':
            return { web: `/archive?city=${slug}`, app: `forecastarena://archive?city=${slug}` }
    }
}

const isSamePage = (a: TextNode[], b: TextNode[]) =>
    a.length === b.length && a.every((node, i) => node.text === b[i].text && node.rect.y === b[i].rect.y)

const measure = (webPng: PNG, webNode: TextNode, appPngs: PNG[], appNode: TextNode, scale: number) => {
    const webInk = getInkBox(webPng, webNode.rect)
    const appInk = getInkBox(appPngs[appNode.image], appNode.rect)

    if (!webInk || !appInk) {
        return null
    }

    const web = { width: webInk.width / scale, height: webInk.height / scale }
    const app = { width: appInk.width / scale, height: appInk.height / scale }
    const widthDelta = (app.width - web.width) / web.width
    const heightDelta = app.height - web.height
    const isDifferent = Math.abs(widthDelta) > WIDTH_TOLERANCE || Math.abs(heightDelta) > HEIGHT_TOLERANCE

    return { text: webNode.text, web, app, widthDelta, heightDelta, isDifferent, webRect: webNode.rect, appNode }
}

const formatRow = (m: Measurement, i: number) =>
    `| ${i + 1} | ${m.text.replace(/\|/g, '\\|').slice(0, 60)} | ${m.web.width.toFixed(1)} × ${m.web.height.toFixed(1)} | ` +
    `${m.app.width.toFixed(1)} × ${m.app.height.toFixed(1)} | ${(m.widthDelta * 100).toFixed(1)} % | ` +
    `${m.heightDelta.toFixed(1)} | ${m.isDifferent ? '**differs**' : ''} |`

const formatList = (texts: string[]) => (texts.length ? texts.map((text) => `- ${text}`).join('\n') : '- none')

const buildReport = (title: string, measurements: Measurement[], webOnly: string[], appOnly: string[]) => {
    const different = measurements.filter((m) => m.isDifferent)

    return `# Parity: ${title}

Ink boxes of the same text on the web's phone layout and in the app, in dp (CSS px on the web). A width gap over
${WIDTH_TOLERANCE * 100} % or a height gap over ${HEIGHT_TOLERANCE} dp means a different size, weight or font; \`sheet.png\` shows the
differing rows in this order (web left, app right).

${different.length} of ${measurements.length} matched texts differ.

| # | Text | Web w × h | App w × h | Width | Height | |
|---|---|---|---|---|---|---|
${measurements.map(formatRow).join('\n')}

## Only on the web

Texts the app's screen never showed: missing elements, or ones scrolled sideways out of view.

${formatList(webOnly)}

## Only in the app

${formatList(appOnly)}
`
}

const main = async () => {
    if (values.help) {
        console.info(HELP)
        return
    }

    const screen = values.screen as Screen
    const mode = values.mode === 'light' ? 'light' : 'dark'
    const paths = getPaths(screen, values.slug)
    const android = createAndroid(values.device)
    const display = android.getDisplay()
    const waitSeconds = Number(values.wait)

    android.open(paths.app)
    android.wait(waitSeconds)
    android.scrollToTop(display, Number(values['scroll-x']))
    android.wait(1)

    const pages: { png: Buffer; nodes: TextNode[] }[] = []

    for (let i = 0; i < MAX_PAGES; i++) {
        const page = android.capture(i)

        if (pages.length && isSamePage(pages[pages.length - 1].nodes, page.nodes)) {
            break
        }

        pages.push(page)
        android.scrollDown(display, Number(values['scroll-x']))
        android.wait(1)
    }

    const web = await captureWeb({
        url: new URL(paths.web, values.web).href,
        width: Math.round(display.width / display.scale),
        height: Math.round(display.height / display.scale),
        scale: display.scale,
        mode,
        waitMs: waitSeconds * 1000,
    })

    const webPng = decodePng(web.png)
    const appPngs = pages.map(({ png }) => decodePng(png))
    const appNodes = stitchPages(
        pages.map(({ nodes }) => nodes),
        Math.round(display.height * SCROLL_SHARE),
    )
    const { pairs, webOnly, appOnly } = pairNodes(placeWebNodes(web.nodes), appNodes)

    const measurements = pairs
        .flatMap((pair) => measure(webPng, pair.web, appPngs, pair.app, display.scale) ?? [])
        .sort(
            (a, b) => Number(b.isDifferent) - Number(a.isDifferent) || Math.abs(b.widthDelta) - Math.abs(a.widthDelta),
        )

    const title = `${screen}${values.slug ? ` ${values.slug}` : ''}, ${mode}`
    const folder = path.join(values.out, `${screen}-${mode}-${new Date().toISOString().replace(/[:.]/g, '-')}`)
    const sheetRows = measurements
        .filter((m) => m.isDifferent)
        .slice(0, MAX_SHEET_ROWS)
        .map((m) => ({ web: webPng, webRect: m.webRect, app: appPngs[m.appNode.image], appRect: m.appNode.rect }))

    mkdirSync(folder, { recursive: true })
    writeFileSync(path.join(folder, 'web.png'), web.png)
    pages.forEach(({ png }, i) => writeFileSync(path.join(folder, `app-${i + 1}.png`), png))
    writeFileSync(path.join(folder, 'side-by-side.png'), buildSideBySide(decodePng(web.viewportPng), appPngs[0]))
    writeFileSync(path.join(folder, 'sheet.png'), buildSheet(sheetRows))
    writeFileSync(path.join(folder, 'report.md'), buildReport(title, measurements, webOnly, appOnly))

    console.info(
        `${measurements.filter((m) => m.isDifferent).length} of ${measurements.length} texts differ: ${folder}`,
    )
}

await main()

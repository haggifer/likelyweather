import { PNG } from 'pngjs'
import type { Rect } from './types.ts'

// A channel this far from the background counts as ink; antialiased glyph edges fade below it.
const INK_THRESHOLD = 64
// Pixels around a text box searched too, for glyphs that overhang it (italic tails, accents).
const MARGIN = 2
const GAP = 12

export const decodePng = (buffer: Buffer) => PNG.sync.read(buffer)

const getPixel = (png: PNG, x: number, y: number) => {
    const offset = (y * png.width + x) * 4

    return [png.data[offset], png.data[offset + 1], png.data[offset + 2]]
}

const clamp = (png: PNG, { x, y, width, height }: Rect): Rect => {
    const left = Math.max(0, x - MARGIN)
    const top = Math.max(0, y - MARGIN)
    const right = Math.min(png.width, x + width + MARGIN)
    const bottom = Math.min(png.height, y + height + MARGIN)

    return { x: left, y: top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) }
}

// The most common colour on the box's edge: the surface the text sits on.
const getBackground = (png: PNG, { x, y, width, height }: Rect) => {
    const counts = new Map<string, { count: number; color: number[] }>()
    const edge = [
        ...Array.from({ length: width }, (_, i) => [x + i, y]),
        ...Array.from({ length: width }, (_, i) => [x + i, y + height - 1]),
        ...Array.from({ length: height }, (_, i) => [x, y + i]),
        ...Array.from({ length: height }, (_, i) => [x + width - 1, y + i]),
    ]

    for (const [px, py] of edge) {
        const color = getPixel(png, px, py)
        const key = color.map((channel) => channel >> 3).join()
        const entry = counts.get(key) ?? { count: 0, color }
        counts.set(key, { ...entry, count: entry.count + 1 })
    }

    return [...counts.values()].sort((a, b) => b.count - a.count)[0]?.color ?? [0, 0, 0]
}

// The tight box of the glyphs inside `rect`: its width follows the font size and weight even where the text's view
// is stretched to its container, which the view bounds alone would hide.
export const getInkBox = (png: PNG, rect: Rect): Rect | null => {
    const area = clamp(png, rect)

    if (area.width < 3 || area.height < 3) {
        return null
    }

    const background = getBackground(png, area)
    let left = Infinity
    let top = Infinity
    let right = -Infinity
    let bottom = -Infinity

    for (let y = area.y; y < area.y + area.height; y++) {
        for (let x = area.x; x < area.x + area.width; x++) {
            const isInk = getPixel(png, x, y).some((channel, i) => Math.abs(channel - background[i]) > INK_THRESHOLD)

            if (isInk) {
                left = Math.min(left, x)
                top = Math.min(top, y)
                right = Math.max(right, x)
                bottom = Math.max(bottom, y)
            }
        }
    }

    return left === Infinity ? null : { x: left, y: top, width: right - left + 1, height: bottom - top + 1 }
}

const copyRegion = (source: PNG, rect: Rect, target: PNG, left: number, top: number) => {
    PNG.bitblt(source, target, rect.x, rect.y, rect.width, rect.height, left, top)
}

// One row per pair, the web's crop on the left and the app's on the right, in the order of the report's table.
export const buildSheet = (rows: { web: PNG; webRect: Rect; app: PNG; appRect: Rect }[]) => {
    const crops = rows.map((row) => ({
        ...row,
        webRect: clamp(row.web, row.webRect),
        appRect: clamp(row.app, row.appRect),
    }))
    const webWidth = Math.max(1, ...crops.map(({ webRect }) => webRect.width))
    const width = webWidth + GAP + Math.max(1, ...crops.map(({ appRect }) => appRect.width))
    const heights = crops.map(({ webRect, appRect }) => Math.max(webRect.height, appRect.height) + GAP)
    const sheet = new PNG({
        width,
        height: Math.max(
            1,
            heights.reduce((sum, height) => sum + height, 0),
        ),
    })
    sheet.data.fill(255)

    crops.reduce((top, crop, i) => {
        copyRegion(crop.web, crop.webRect, sheet, 0, top)
        copyRegion(crop.app, crop.appRect, sheet, webWidth + GAP, top)

        return top + heights[i]
    }, 0)

    return PNG.sync.write(sheet)
}

const isSameRow = (a: PNG, b: PNG, y: number) => {
    const start = y * a.width * 4

    return a.data.subarray(start, start + a.width * 4).equals(b.data.subarray(start, start + b.width * 4))
}

// The fixed top from the pixels, for a screen without a fixed text: the rows two consecutive pages share from the top
// (the header and a sticky bar), found after the status bar, whose clock may have ticked between them. It stops within
// the top `maxRows`, so a run of plain background rows in the content can't carry it far.
export const getFixedRows = (pages: PNG[], maxRows: number) =>
    Math.max(
        0,
        ...pages.slice(1).map((page, i) => {
            const previous = pages[i]
            const limit = Math.min(maxRows, page.height, previous.height)
            let y = 0

            while (y < limit && !isSameRow(previous, page, y)) y++

            while (y < limit && isSameRow(previous, page, y)) y++

            return y < limit ? y : 0
        }),
    )

// The app's screenshots laid at their places in the scrolled content: one tall image like the web's full page. The
// first page is whole; each later one adds what lies below the fixed top (`fixedTop`), painting over the earlier
// page's bottom edge, where the navigation bar sat.
export const buildTallImage = (pages: PNG[], offsets: number[], fixedTop: number) => {
    const width = Math.max(...pages.map((page) => page.width))
    const image = new PNG({ width, height: Math.max(...pages.map((page, i) => offsets[i] + page.height)) })
    image.data.fill(255)
    pages.forEach((page, i) => {
        const top = i ? Math.min(fixedTop, page.height) : 0

        copyRegion(page, { x: 0, y: top, width: page.width, height: page.height - top }, image, 0, offsets[i] + top)
    })

    return image
}

export const buildSideBySide = (web: PNG, app: PNG) => {
    const sheet = new PNG({ width: web.width + GAP + app.width, height: Math.max(web.height, app.height) })
    sheet.data.fill(255)
    copyRegion(web, { x: 0, y: 0, width: web.width, height: web.height }, sheet, 0, 0)
    copyRegion(app, { x: 0, y: 0, width: app.width, height: app.height }, sheet, web.width + GAP, 0)

    return PNG.sync.write(sheet)
}

import { chromium } from '@playwright/test'
import type { Rect, TextNode } from './types.ts'

interface WebCapture {
    url: string
    // The phone's width and height in dp, which the page gets as CSS pixels.
    width: number
    height: number
    scale: number
    mode: 'light' | 'dark'
    waitMs: number
}

interface WebPage {
    // The whole page, and the first screen of it for the side-by-side view.
    png: Buffer
    viewportPng: Buffer
    nodes: TextNode[]
}

// Runs in the page: every element that holds text itself (as a React Native Text does), with its whole visible text
// and the box of its text runs only (not its padding or icons), in page CSS pixels. Chart text is SVG, which the
// app's view dump does not list either.
const collectTextBoxes = () => {
    const normalize = (value: string) => value.replace(/\s+/g, ' ').trim()
    const boxes: { text: string; x: number; y: number; width: number; height: number }[] = []

    for (const element of document.body.querySelectorAll<HTMLElement>('*')) {
        const text = normalize(element.innerText ?? '')
        const holdsText = [...element.childNodes].some(
            (child) => child.nodeType === Node.TEXT_NODE && child.textContent?.trim(),
        )

        if (!text || !holdsText || element.closest('svg')) {
            continue
        }

        const range = document.createRange()
        const rects: DOMRect[] = []
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)

        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            if (node.textContent?.trim()) {
                range.selectNodeContents(node)
                rects.push(...[...range.getClientRects()].filter((rect) => rect.width > 0 && rect.height > 0))
            }
        }

        // A text run's box is its font's full height, taller than a tight line, so it reaches into the lines around
        // it; the element's own box stops it there, as an Android text view's bounds do.
        const box = element.getBoundingClientRect()
        const left = Math.min(...rects.map((rect) => rect.left))
        const top = Math.max(box.top, Math.min(...rects.map((rect) => rect.top)))
        const right = Math.max(...rects.map((rect) => rect.right))
        const bottom = Math.min(box.bottom, Math.max(...rects.map((rect) => rect.bottom)))

        // Visually hidden text (`sr-only`) is clipped to a pixel.
        if (rects.length && right - left > 2 && bottom - top > 2) {
            boxes.push({ text, x: left + scrollX, y: top + scrollY, width: right - left, height: bottom - top })
        }
    }

    return boxes
}

const toDevicePixels = ({ x, y, width, height }: Rect, scale: number): Rect => ({
    x: Math.round(x * scale),
    y: Math.round(y * scale),
    width: Math.round(width * scale),
    height: Math.round(height * scale),
})

export const captureWeb = async ({ url, width, height, scale, mode, waitMs }: WebCapture): Promise<WebPage> => {
    const browser = await chromium.launch()

    try {
        const context = await browser.newContext({
            viewport: { width, height },
            deviceScaleFactor: scale,
            isMobile: true,
            hasTouch: true,
            colorScheme: mode,
        })
        await context.addInitScript((value) => localStorage.setItem('fa.mode', value), mode)

        const page = await context.newPage()
        await page.goto(url, { waitUntil: 'networkidle' })
        await page.waitForTimeout(waitMs)

        const viewportPng = await page.screenshot()

        // A full-page screenshot lays the page out again at its full height, which moves fixed and sticky parts away
        // from the boxes measured before it; one tall viewport keeps the boxes and the pixels from the same layout.
        const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight)
        await page.setViewportSize({ width, height: pageHeight })
        await page.waitForTimeout(500)

        const boxes = await page.evaluate(collectTextBoxes)
        const png = await page.screenshot()

        return {
            png,
            viewportPng,
            nodes: boxes.map(({ text, ...rect }) => ({ text, rect: toDevicePixels(rect, scale), image: 0 })),
        }
    } finally {
        await browser.close()
    }
}

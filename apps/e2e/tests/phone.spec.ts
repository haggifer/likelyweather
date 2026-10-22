import { expect, Page, test } from '@playwright/test'

const KYIV = 'kyiv-ua-703448'
const PAGES = ['/', `/city/${KYIV}`, '/methodology', '/privacy', '/terms']
const WEEKDAY = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/
const PHONE_LEGEND_WIDTHS = [360, 412]

const expectNoSideScroll = async (page: Page) => {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)

    expect(overflow).toBeLessThanOrEqual(0)
}

// Serialized into the page by `evaluateAll`, so it must not reference anything else in this module.
const getClippedNames = (items: Element[]) =>
    items
        .filter((li) => (li as HTMLElement).offsetParent !== null)
        .flatMap((li) => Array.from(li.querySelectorAll('span.truncate')))
        .filter((span) => span.scrollWidth > span.clientWidth)
        .map((span) => span.textContent)

test.beforeEach(async ({ context }) => {
    await context.addCookies([{ name: 'NEXT_LOCALE', value: 'en', url: 'http://localhost:3100' }])
})

for (const path of PAGES) {
    test(`${path} never scrolls sideways`, async ({ page }) => {
        await page.goto(path)
        await expect(page.locator('main h1').first()).toBeVisible()
        await expectNoSideScroll(page)
    })
}

// The Pixel 7 profile carries an Android user agent and touch. The bar exists only in a build made with
// NEXT_PUBLIC_APP_PROMO_URL set; the same variable in this shell says whether that build is the one under test.
test('an Android phone sees the "Get the app" bar on the landing and city pages until it is dismissed', async ({
    page,
    isMobile,
}) => {
    test.skip(!isMobile, 'phone layout only')
    test.skip(!process.env.NEXT_PUBLIC_APP_PROMO_URL, 'the build has no app promo link')

    const bar = page.getByRole('region', { name: 'Get the Android app' })

    await page.goto('/')
    await expect(bar).toBeVisible()
    await expect(bar.getByRole('link', { name: 'Get the app' })).toHaveAttribute('href', /releases/)
    await page.goto(`/city/${KYIV}`)
    await expect(bar).toBeVisible()
    await page.getByRole('contentinfo').getByRole('link', { name: 'Privacy Policy' }).scrollIntoViewIfNeeded()
    await expect(page.getByRole('contentinfo').getByRole('link', { name: 'Privacy Policy' })).toBeInViewport()
    await page.goto('/methodology')
    await expect(bar).toHaveCount(0)

    await page.goto('/')
    await bar.getByRole('button', { name: 'Dismiss' }).click()
    await expect(bar).toHaveCount(0)
    await page.reload()
    await expect(page.locator('main h1').first()).toBeVisible()
    await expect(bar).toHaveCount(0)
})

// A phone held sideways has no room above or below the period button for the calendar.
test('the archive calendar keeps its month controls on screen on a phone held sideways', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'phone layout only')

    await page.setViewportSize({ width: 852, height: 393 })
    await page.goto(`/archive?city=${KYIV}`)
    await page.getByRole('button', { name: /^Period: / }).click()

    const dialog = page.getByRole('dialog', { name: 'Period' })

    await expect(dialog.getByRole('button', { name: 'Previous year' })).toBeInViewport()
    await expect(dialog.getByRole('button', { name: 'Next year' })).toBeInViewport()
})

// Ten days never squeeze into a phone: the chart grows past its card and scrolls inside it, never the page.
test('the overview chart scrolls inside its card', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'phone layout only')

    await page.goto(`/?city=${KYIV}`)

    const chart = page.getByRole('img', { name: /^Median forecast for Kyiv/ })

    await expect(chart).toBeVisible()

    const [scrollWidth, clientWidth] = await chart.evaluate((svg) => {
        const scroller = svg.closest('.overflow-x-auto')!

        return [scroller.scrollWidth, scroller.clientWidth]
    })

    expect(scrollWidth).toBeGreaterThan(clientWidth)
    await expectNoSideScroll(page)
})

test('the dashboard chart labels its days', async ({ page }) => {
    await page.goto(`/city/${KYIV}`)

    // Day labels belong to the chart's static drawing, beside the interactive layer that carries its name.
    const labels = page.locator('main svg text').filter({ hasText: WEEKDAY })

    await expect(labels.first()).toBeVisible()

    const labelCount = await labels.count()

    expect(labelCount).toBeGreaterThanOrEqual(3)
})

test('the variable switch stays in view and the model list sits under the chart', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'phone layout only')

    await page.goto(`/city/${KYIV}`)
    await expect(page.locator('main svg[role=img]').first()).toBeVisible()

    // On phones the chart card and the model list share one sheet, the list in its own section under the chart.
    const sheet = page.locator('main [data-sheet]')
    const hideButton = sheet.getByRole('button', { name: /^Hide / }).first()

    await expect(hideButton).toBeVisible()

    const chartBox = await sheet.locator('[data-slot=card]').first().boundingBox()
    const hideBox = await hideButton.boundingBox()

    expect(hideBox?.y ?? 0).toBeGreaterThanOrEqual((chartBox?.y ?? 0) + (chartBox?.height ?? 0))
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))

    const box = await page.getByRole('radiogroup', { name: 'Variable' }).boundingBox()

    expect(box?.y ?? -1).toBeGreaterThanOrEqual(0)
    expect(box?.y ?? 999).toBeLessThan(140)
})

test('model names in the phone legend wrap instead of clipping', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'phone layout only')

    for (const width of PHONE_LEGEND_WIDTHS) {
        await page.setViewportSize({ width, height: 800 })
        await page.goto(`/city/${KYIV}`)
        await expect(page.locator('main svg[role=img]').first()).toBeVisible()

        const rows = page.locator('main [data-sheet] li')

        await expect(rows.first()).toBeVisible()

        const clippedNames = await rows.evaluateAll(getClippedNames)

        expect(clippedNames, `clipped at ${width}px`).toEqual([])
    }
})

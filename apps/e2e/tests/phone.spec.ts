import { expect, Page, test } from '@playwright/test'

const KYIV = 'kyiv-ua-703448'
const LONDON = 'london-gb-2643743'
const PAGES = [
    '/',
    `/city/${KYIV}`,
    `/compare?cities=${KYIV},${LONDON}`,
    '/cities',
    '/methodology',
    '/privacy',
    '/terms',
]
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

test('the dashboard chart labels its days', async ({ page }) => {
    await page.goto(`/city/${KYIV}`)

    const labels = page.locator('main svg[role=img]').first().locator('text').filter({ hasText: WEEKDAY })

    await expect(labels.first()).toBeVisible()

    const labelCount = await labels.count()

    expect(labelCount).toBeGreaterThanOrEqual(3)
})

test('the variable switch stays in view and the model list sits under the chart', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'phone layout only')

    await page.goto(`/city/${KYIV}`)
    await expect(page.locator('main svg[role=img]').first()).toBeVisible()

    const chartCard = page.locator('main [data-slot=card]').first()

    await expect(chartCard.getByRole('button', { name: /^Hide / }).first()).toBeVisible()
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

        const chartCard = page.locator('main [data-slot=card]').first()
        const rows = chartCard.locator('li')

        await expect(rows.first()).toBeVisible()

        const clippedNames = await rows.evaluateAll(getClippedNames)

        expect(clippedNames, `clipped at ${width}px`).toEqual([])
    }
})

test('cities are cards on phones and a table elsewhere', async ({ page, isMobile }) => {
    await page.goto('/cities')

    const citiesList = page.getByRole('list', { name: 'Tracked cities' })
    const citiesTable = page.locator('main table')

    await expect(isMobile ? citiesList : citiesTable).toBeVisible()
    await expect(isMobile ? citiesTable : citiesList).toBeVisible({ visible: false })
})

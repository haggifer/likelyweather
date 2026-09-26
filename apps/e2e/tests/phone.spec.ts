import { expect, Page, test } from '@playwright/test'

const KYIV = 'kyiv-ua-703448'
const LONDON = 'london-gb-2643743'
const PAGES = ['/', `/city/${KYIV}`, `/compare?cities=${KYIV},${LONDON}`, '/runs', '/cities', '/methodology']
const WEEKDAY = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/

const expectNoSideScroll = async (page: Page) => {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)

    expect(overflow).toBeLessThanOrEqual(0)
}

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
    expect(await labels.count()).toBeGreaterThanOrEqual(3)
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

test('runs and cities are cards on phones and tables elsewhere', async ({ page, isMobile }) => {
    // Opening a city makes sure at least one run exists.
    await page.goto(`/city/${KYIV}`)
    await expect(page.locator('main svg[role=img]').first()).toBeVisible()

    await page.goto('/runs')
    await expect(page.getByRole('list', { name: 'Run history' })).toBeVisible({ visible: isMobile })
    await expect(page.locator('main table').last()).toBeVisible({ visible: !isMobile })

    await page.goto('/cities')
    await expect(page.getByRole('list', { name: 'Tracked cities' })).toBeVisible({ visible: isMobile })
    await expect(page.locator('main table')).toBeVisible({ visible: !isMobile })
})

test('the runs table renders rows after widening past the phone breakpoint', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'reproduces a phone-to-desktop resize')
    // Opening a city makes sure at least one run exists.
    await page.goto(`/city/${KYIV}`)
    await expect(page.locator('main svg[role=img]').first()).toBeVisible()

    await page.goto('/runs')
    await page.setViewportSize({ width: 1280, height: 900 })

    await expect(page.locator('main table tbody tr:not([aria-hidden])').first()).toBeVisible()
})

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

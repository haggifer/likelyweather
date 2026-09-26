import AxeBuilder from '@axe-core/playwright'
import { expect, Page, test } from '@playwright/test'

const KYIV = 'kyiv-ua-703448'
const LONDON = 'london-gb-2643743'

// The overview card is the first card on the landing page; its title names the city.
const overviewTitle = (page: Page) => page.locator('[data-slot=card] [data-slot=card-title]').first()

test.beforeEach(async ({ context }) => {
    // Every test starts in English, whatever an earlier test chose.
    await context.addCookies([{ name: 'NEXT_LOCALE', value: 'en', url: 'http://localhost:3100' }])
})

test('search tracks a new city, shows its overview, then its dashboard', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('combobox', { name: 'Search any city' }).fill('Vinnytsia')
    await page.getByRole('option', { name: /Vinnytsia/ }).click()

    await expect(page).toHaveURL(/city=vinnytsia-ua-689558/)
    await expect(overviewTitle(page)).toContainText('Vinnytsia')
    await expect(page.locator('[data-slot=card] svg[role=img]').first()).toBeVisible()

    await page.getByRole('link', { name: 'Open details' }).click()

    await expect(page).toHaveURL(/\/city\/vinnytsia-ua-689558/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Vinnytsia')
    await expect(page.locator('main svg[role=img]').first()).toBeVisible()
})

test('a "Start with" chip switches the overview in place', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'London' }).click()

    await expect(page).toHaveURL(new RegExp(`city=${LONDON}`))
    await expect(overviewTitle(page)).toContainText('London')
})

test('the dashboard switches variables and draws precipitation as bars', async ({ page }) => {
    await page.goto(`/city/${KYIV}`)
    await page.getByRole('radio', { name: 'Precipitation' }).click()

    await expect(page).toHaveURL(/v=precip/)
    await expect(page.locator('main [data-slot=card-title]').first()).toHaveText('Precipitation')
    await expect(page.locator('main svg[role=img] rect[rx="2"]').first()).toBeAttached()
})

test('compare shows one chart per city on a shared axis', async ({ page }) => {
    await page.goto(`/compare?cities=${KYIV},${LONDON}`)

    await expect(page.locator('main svg[role=img]')).toHaveCount(2)
})

test('the language menu switches the interface to Ukrainian', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Language' }).click()
    await page.getByRole('menuitemradio', { name: 'Українська' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Порівнюйте прогнози погоди для свого міста')
})

for (const path of ['/', `/city/${KYIV}`]) {
    test(`${path} has no serious accessibility violations`, async ({ page }) => {
        await page.goto(path)
        await expect(page.locator('svg[role=img]').first()).toBeVisible()

        const { violations } = await new AxeBuilder({ page }).analyze()
        const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')

        expect(serious.map((v) => `${v.id}: ${v.nodes.length} nodes`)).toEqual([])
    })
}

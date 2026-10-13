import AxeBuilder from '@axe-core/playwright'
import { expect, Page, test } from '@playwright/test'

const KYIV = 'kyiv-ua-703448'
const LONDON = 'london-gb-2643743'
// A seed city, so the nearest stored city is right there; and a spot in the ocean, hundreds of kilometres from any.
const KHARKIV_POSITION = { latitude: 49.9935, longitude: 36.2304 }
const MID_ATLANTIC = { latitude: 30, longitude: -40 }

// The overview card is the first card on the landing page; its title names the city.
const getOverviewTitle = (page: Page) => page.locator('[data-slot=card] [data-slot=card-title]').first()

// A chip is a city button and a star button; the stars have only an aria-label.
const getChipNames = (page: Page) =>
    page.getByRole('group', { name: 'Start with' }).locator('button[aria-pressed]:not([aria-label])').allInnerTexts()

const toStoredPlace = (id: number, name: string) => ({
    id,
    slug: `${name.toLowerCase()}-${id}`,
    name,
    country: 'X',
    countryCode: 'XX',
})

const getSeriousViolations = async (page: Page) => {
    const { violations } = await new AxeBuilder({ page }).analyze()

    return violations
        .filter((v) => v.impact === 'serious' || v.impact === 'critical')
        .map((v) => `${v.id}: ${v.nodes.length} nodes`)
}

test.beforeEach(async ({ context }) => {
    // Every test starts in English, whatever an earlier test chose.
    await context.addCookies([{ name: 'NEXT_LOCALE', value: 'en', url: 'http://localhost:3100' }])
})

test('search tracks a new city, shows its overview, then its dashboard', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('combobox', { name: 'Search any place' }).fill('Vinnytsia')
    await page.getByRole('option', { name: /Vinnytsia/ }).click()

    await expect(page).toHaveURL(/city=vinnytsia-ua-689558/)
    await expect(getOverviewTitle(page)).toContainText('Vinnytsia')
    await expect(page.locator('[data-slot=card] svg[role=img]').first()).toBeVisible()

    await page.getByRole('link', { name: 'Open details' }).click()

    await expect(page).toHaveURL(/\/city\/vinnytsia-ua-689558/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Vinnytsia')
    await expect(page.locator('main svg[role=img]').first()).toBeVisible()
})

test('a first visit starts with the largest places of the viewer country', async ({ browser }) => {
    // CloudFront sets this header in production; here the test sends it the way CloudFront would.
    const context = await browser.newContext({ extraHTTPHeaders: { 'CloudFront-Viewer-Country': 'UA' } })
    const page = await context.newPage()

    await page.goto('/')

    await expect.poll(() => getChipNames(page)).toEqual(expect.arrayContaining(['Kyiv', 'Kharkiv']))
    await expect(getOverviewTitle(page)).toContainText('Kyiv')

    await context.close()
})

test('"Use my location" opens the nearest stored city when it is close', async ({ browser }) => {
    const context = await browser.newContext({ permissions: ['geolocation'], geolocation: KHARKIV_POSITION })
    const page = await context.newPage()

    await page.goto('/')
    await page.getByRole('button', { name: 'Use my location' }).click()

    await expect(page).toHaveURL(/city=kharkiv-ua-706483/)
    await expect(getOverviewTitle(page)).toContainText('Kharkiv')
    await expect.poll(() => getChipNames(page)).toContain('Kharkiv')

    await context.close()
})

test('"Use my location" far from every stored city offers the nearest one instead', async ({ browser }) => {
    const context = await browser.newContext({ permissions: ['geolocation'], geolocation: MID_ATLANTIC })
    const page = await context.newPage()

    await page.goto('/')
    await page.getByRole('button', { name: 'Use my location' }).click()

    await expect(page.getByText(/The nearest stored city is .*, [\d,]+ km away/)).toBeVisible()
    await page.getByRole('button', { name: 'Search' }).click()
    await expect(page.getByRole('combobox', { name: 'Search any place' })).toBeFocused()

    await context.close()
})

test('"Use my location" without permission says so and leaves the city alone', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Use my location' }).click()

    await expect(page.getByText('Location is not available; search for your city instead')).toBeVisible()
    await expect(page).not.toHaveURL(/city=/)
})

test('a "Start with" chip switches the overview in place', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'London', exact: true }).click()

    await expect(page).toHaveURL(new RegExp(`city=${LONDON}`))
    await expect(getOverviewTitle(page)).toContainText('London')
})

test('the dashboard switches variables and draws precipitation as bars', async ({ page }) => {
    await page.goto(`/city/${KYIV}`)
    await page.getByRole('radio', { name: 'Precipitation' }).click()

    await expect(page).toHaveURL(/v=precip/)
    await expect(page.locator('main [data-slot=card-title]').first()).toHaveText('Precipitation')
    // The bars sit in the chart's static drawing, under the interactive layer that carries the chart's name.
    await expect(page.locator('main svg rect[rx="2"]').first()).toBeAttached()
})

// The charts scroll inside their cards, which would clip a ring drawn on the chart itself; the ring sits on the frame
// around the scroller instead, so keyboard focus stays visible.
test('a focused chart shows its focus ring around the scrolling plot', async ({ page }) => {
    await page.goto(`/?city=${LONDON}`)

    const chart = page.getByRole('img', { name: /^Median forecast for London/ })

    await chart.focus()

    const shadow = await chart.evaluate((svg) => getComputedStyle(svg.closest('.rounded-sm')!).boxShadow)

    expect(shadow).not.toBe('none')
})

// Every overview series arrives with the first load: asking for one later would collect a newer run for that panel
// alone once the stored one is 3 hours old.
test('showing a hidden overview panel draws it without another request', async ({ page }) => {
    await page.goto(`/?city=${LONDON}`)
    await expect(page.getByRole('img', { name: /^Median forecast for London/ })).toBeVisible()

    const requests: string[] = []

    page.on('request', (request) => {
        if (request.url().includes('/latest')) requests.push(request.url())
    })
    await page.getByRole('button', { name: 'Panels', exact: true }).click()
    await page.getByRole('button', { name: 'Show Humidity' }).click()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Overview panels' })).toBeHidden()

    await expect(page.getByText('Humidity', { exact: true })).toBeVisible()
    expect(requests).toEqual([])
})

test('a panel moves by keyboard with its handle, and Escape cancels a move without closing the menu', async ({
    page,
}) => {
    await page.goto(`/?city=${LONDON}`)
    await page.getByRole('button', { name: 'Panels', exact: true }).click()

    const handle = page.getByRole('button', { name: 'Reorder Temperature' })
    const rows = page.getByRole('dialog', { name: 'Overview panels' }).getByRole('listitem')

    // The handle reads as pressed while its row is held, and the held row slides down before it is dropped.
    const moveDown = async (finalKey: string) => {
        await page.keyboard.press('Space')
        await expect(handle).toHaveAttribute('aria-pressed', 'true')
        await page.keyboard.press('ArrowDown')
        await expect(handle.locator('xpath=ancestor::li')).toHaveAttribute('style', /translate3d\(0px, [1-9]/)
        await page.keyboard.press(finalKey)
        await expect(handle).not.toHaveAttribute('aria-pressed')
    }

    await handle.focus()
    await moveDown('Space')
    await expect(rows.nth(1)).toContainText('Temperature')
    await expect(handle).toBeFocused()
    await moveDown('Escape')
    await expect(rows.nth(1)).toContainText('Temperature')
    await expect(page.getByRole('dialog', { name: 'Overview panels' })).toBeVisible()
    await page.getByRole('button', { name: 'Hide Temperature' }).click()
    await expect(rows.nth(1).getByRole('button', { name: 'Show Temperature' })).toBeVisible()
})

test('the archive picks its period on a range calendar, capped at twelve days, and keeps it', async ({
    page,
    isMobile,
}) => {
    await page.goto(`/archive?city=${LONDON}`)

    await expect(page.getByRole('img', { name: /^Past weather for London/ })).toBeVisible()

    const trigger = page.getByRole('button', { name: /^Period: / })

    await trigger.click()

    for (let i = 0; i < 36 && !(await page.getByRole('heading', { name: 'January 2026' }).isVisible()); i++) {
        await page.getByRole('button', { name: 'Previous month' }).click()
    }

    await page.getByRole('button', { name: /January 1, 2026/ }).click()
    // The first tap leaves the eleven days after it; later days are disabled.
    await expect(page.getByRole('button', { name: /January 13, 2026/ })).toHaveAttribute('aria-disabled', 'true')
    await page.getByRole('button', { name: /January 12, 2026/ }).click()

    await expect(trigger).toHaveAccessibleName('Period: 01.01.2026 – 12.01.2026')
    await expect(page.getByRole('img', { name: /1 Jan 2026 to 12 Jan 2026/ })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('button', { name: 'Period: 01.01.2026 – 12.01.2026' })).toBeVisible()

    if (!isMobile) {
        await expect(
            page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Archive' }),
        ).toHaveAttribute('aria-current', 'page')
    }
})

test('the header marks Forecast as the current page on the landing and on a city dashboard', async ({
    page,
    isMobile,
}) => {
    test.skip(isMobile, 'phones reach the pages through the menu')

    const forecast = page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Forecast' })

    for (const path of ['/', `/city/${KYIV}`]) {
        await page.goto(path)
        await expect(forecast).toHaveAttribute('aria-current', 'page')
    }
})

test('an unknown city page says so and offers the search', async ({ page }) => {
    await page.goto('/city/nowhere-xx-1')

    await expect(page.getByRole('heading', { name: 'This city is not in Forecast Arena' })).toBeVisible()
    await expect(page.getByRole('combobox', { name: 'Search any place' })).toBeVisible()
})

test('the language menu switches the interface to Ukrainian', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Language' }).click()
    await page.getByRole('menuitemradio', { name: 'Українська' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Forecast Arena: порівняння прогнозів погоди')
})

for (const path of ['/', `/city/${KYIV}`]) {
    test(`${path} has no serious accessibility violations`, async ({ page }) => {
        await page.goto(path)
        await expect(page.locator('svg[role=img]').first()).toBeVisible()

        const serious = await getSeriousViolations(page)

        expect(serious).toEqual([])
    })
}

test('a desktop never sees the "Get the app" bar', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop only')

    await page.goto('/')
    await expect(page.locator('main h1').first()).toBeVisible()
    await expect(page.getByRole('region', { name: 'Get the Android app' })).toHaveCount(0)
})

test('the footer links to the privacy policy and the terms', async ({ page }) => {
    for (const [link, heading] of [
        ['Privacy Policy', 'Privacy Policy'],
        ['Terms of Use', 'Terms of Use'],
    ]) {
        await page.goto('/methodology')
        await page.getByRole('contentinfo').getByRole('link', { name: link }).click()
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading)

        const serious = await getSeriousViolations(page)

        expect(serious).toEqual([])
    }
})

test('a searched city becomes the first chip and the oldest one drops', async ({ page }) => {
    await page.goto('/')
    await expect.poll(() => getChipNames(page)).toEqual(['New York', 'London', 'Paris', 'Kyiv'])

    await page.getByRole('combobox', { name: 'Search any place' }).fill('Vinnytsia')
    await page.getByRole('option', { name: /Vinnytsia/ }).click()

    await expect.poll(() => getChipNames(page)).toEqual(['Vinnytsia', 'New York', 'London', 'Paris'])
})

test('a pinned city moves to the front of the chips and opens the landing page', async ({ page }) => {
    await page.goto(`/city/${LONDON}`)
    await page.getByRole('button', { name: 'Add London to favorites' }).click()

    await expect(page.getByRole('button', { name: 'Remove London from favorites' })).toHaveAttribute(
        'aria-pressed',
        'true',
    )

    await page.goto('/')

    await expect.poll(() => getChipNames(page)).toEqual(['London', 'New York', 'Paris', 'Kyiv'])
    await expect(getOverviewTitle(page)).toContainText('London')
})

test('the star explains why it is disabled once four places are favorites', async ({ page, isMobile }) => {
    const favorites = [
        toStoredPlace(1, 'Alpha'),
        toStoredPlace(2, 'Beta'),
        toStoredPlace(3, 'Gamma'),
        toStoredPlace(4, 'Delta'),
    ]

    await page.addInitScript(
        (value) => localStorage.setItem('fa.places', value),
        JSON.stringify({ favorites, recents: [] }),
    )

    await page.goto(`/city/${KYIV}`)

    const star = page.getByRole('button', { name: 'Add Kyiv to favorites' })

    await expect(star).toBeDisabled()

    // A touch screen opens the hint on a tap, a mouse on hover.
    if (isMobile) {
        await star.locator('..').tap()
        await expect(page.getByRole('dialog')).toContainText('You already have 4 favorites')
    } else {
        await star.locator('..').hover()
        await expect(page.getByRole('tooltip')).toContainText('You already have 4 favorites')
    }
})

test('the empty search box offers your places', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('combobox', { name: 'Search any place' }).focus()

    await expect(page.getByRole('group', { name: 'Your places' }).getByRole('option')).toHaveText([
        /New York/,
        /London/,
        /Paris/,
        /Kyiv/,
    ])
})

test('the star on a chip pins the city to the front and unpins it again', async ({ page }) => {
    await page.goto('/')
    await expect.poll(() => getChipNames(page)).toEqual(['New York', 'London', 'Paris', 'Kyiv'])

    // The overview card's star names its city too, so the chip's star is found inside the chips.
    const chips = page.getByRole('group', { name: 'Start with' })

    await chips.getByRole('button', { name: 'Add Paris to favorites' }).click()

    await expect.poll(() => getChipNames(page)).toEqual(['Paris', 'New York', 'London', 'Kyiv'])
    await expect(chips.getByRole('button', { name: 'Remove Paris from favorites' })).toHaveAttribute(
        'aria-pressed',
        'true',
    )

    await chips.getByRole('button', { name: 'Remove Paris from favorites' }).click()

    await expect(chips.getByRole('button', { name: 'Add Paris to favorites' })).toHaveAttribute('aria-pressed', 'false')
})

test('the empty search box lists more searched places than the chips show', async ({ page }) => {
    const recents = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta'].map((name, i) => toStoredPlace(i + 1, name))

    await page.addInitScript(
        (value) => localStorage.setItem('fa.places', value),
        JSON.stringify({ favorites: [], recents }),
    )

    await page.goto('/')
    await page.getByRole('combobox', { name: 'Search any place' }).focus()

    await expect(page.getByRole('group', { name: 'Your places' }).getByRole('option')).toHaveCount(6)
    await expect.poll(() => getChipNames(page)).toEqual(['Alpha', 'Beta', 'Gamma', 'Delta'])
})

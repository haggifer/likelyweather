import { expect, Page, test } from '@playwright/test'

const SITE = 'https://likelyweather.com'
const KYIV = 'kyiv-ua-703448'

const PAGES = [
    { path: '/', title: 'Likely Weather: Ten weather models compared for any city', schema: 'WebSite' },
    {
        path: `/city/${KYIV}`,
        title: 'Kyiv, Ukraine: 10-day forecast from ten weather models · Likely Weather',
        schema: 'WebPage',
    },
    { path: '/archive', title: 'Past weather · Likely Weather', schema: 'WebPage' },
]

const getMeta = (page: Page, selector: string) => page.locator(`head ${selector}`).getAttribute('content')

// Next.js streams a page's metadata after its first HTML to browsers, and puts it in <head> only for crawlers it
// knows by their user agent, LinkedIn's among them.
test.use({ userAgent: 'LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)' })

for (const { path, title, schema } of PAGES) {
    test(`${path} carries its title, description, canonical address, share image and structured data`, async ({
        page,
        request,
    }) => {
        await page.goto(path)

        const canonical = await page.locator('head link[rel=canonical]').getAttribute('href')
        const image = await getMeta(page, 'meta[property="og:image"]')
        const structuredData = await page.locator('script[type="application/ld+json"]').first().textContent()
        const imageResponse = await request.get(new URL(image ?? '').pathname)

        await expect(page).toHaveTitle(title)
        expect(await getMeta(page, 'meta[name=description]')).toBeTruthy()
        expect(canonical).toBe(`${SITE}${path === '/' ? '' : path}`)
        expect(await getMeta(page, 'meta[property="og:title"]')).toBeTruthy()
        expect(await getMeta(page, 'meta[property="og:url"]')).toBe(canonical)
        expect(await getMeta(page, 'meta[name="twitter:card"]')).toBe('summary_large_image')
        expect(image?.startsWith(`${SITE}/`)).toBe(true)
        expect(imageResponse.ok()).toBe(true)
        expect(imageResponse.headers()['content-type']).toBe('image/png')
        expect(structuredData).toContain(`"${schema}"`)
    })
}

test('robots.txt allows the pages, keeps crawlers off the API and names the sitemap', async ({ request }) => {
    const robots = await (await request.get('/robots.txt')).text()

    expect(robots).toContain('Allow: /')
    expect(robots).toContain('Disallow: /api/')
    expect(robots).toContain(`Sitemap: ${SITE}/sitemap.xml`)
})

test('the sitemap lists the main pages and the seed cities', async ({ request }) => {
    const sitemap = await (await request.get('/sitemap.xml')).text()

    expect(sitemap).toContain(`<loc>${SITE}/</loc>`)
    expect(sitemap).toContain(`<loc>${SITE}/archive</loc>`)
    expect(sitemap).toContain(`<loc>${SITE}/city/${KYIV}</loc>`)
})

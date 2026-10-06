import { createHash } from 'node:crypto'
import { apiGet, apiPost, ApiRequestError, configureApi, DEFAULT_API_CONFIG, isNotFound } from './api'

const respond = (status: number, body: unknown) =>
    vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))

const getHeaders = (fetch: ReturnType<typeof respond>) => {
    const [, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]

    return init.headers as Record<string, string>
}

afterEach(() => {
    vi.unstubAllGlobals()
    configureApi(DEFAULT_API_CONFIG)
})

describe('apiGet', () => {
    it('requests /api paths on the configured origin, without empty parameters', async () => {
        const fetch = respond(200, { ok: true })
        vi.stubGlobal('fetch', fetch)
        configureApi({ baseUrl: 'https://example.test' })

        await apiGet('/geocode', { q: 'Kyiv', locale: undefined, empty: '' })

        expect(fetch).toHaveBeenCalledWith('https://example.test/api/geocode?q=Kyiv', undefined)
    })

    it('throws the API error code and status', async () => {
        vi.stubGlobal('fetch', respond(404, { error: { code: 'city_not_found', message: 'No city' } }))

        const error = await apiGet('/cities/x').catch((e: unknown) => e)

        expect(error).toBeInstanceOf(ApiRequestError)
        expect(error).toMatchObject({ status: 404, code: 'city_not_found', message: 'No city' })
        expect(isNotFound(error)).toBe(true)
    })
})

describe('apiPost', () => {
    it('sends the body with its SHA-256, which CloudFront needs to sign a POST', async () => {
        const fetch = respond(200, { slug: 'kyiv-ua-703448' })
        vi.stubGlobal('fetch', fetch)

        await apiPost('/cities/track', { geocodeId: 703448 })

        const expected = createHash('sha256').update('{"geocodeId":703448}').digest('hex')

        expect(getHeaders(fetch)['x-amz-content-sha256']).toBe(expected)
    })

    it('uses the configured digest function', async () => {
        const fetch = respond(200, {})
        vi.stubGlobal('fetch', fetch)
        configureApi({ sha256Hex: async () => 'fixed' })

        await apiPost('/cities/track', {})

        expect(getHeaders(fetch)['x-amz-content-sha256']).toBe('fixed')
    })
})

describe('isNotFound', () => {
    it('is false for other errors', () => {
        expect(isNotFound(new ApiRequestError(500, 'upstream_error', 'x'))).toBe(false)
        expect(isNotFound(new Error('x'))).toBe(false)
    })
})

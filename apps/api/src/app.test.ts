import { loadLocalEnv } from '@fa/db/client'
import request from 'supertest'
import { createApp } from './app'

loadLocalEnv()

const app = createApp({ logRequests: false })

describe('API without the database', () => {
    it('serves the model palette with a public cache header', async () => {
        const res = await request(app).get('/api/models')

        expect(res.status).toBe(200)
        expect(res.headers['cache-control']).toBe('public, max-age=300')
        expect(res.body).toHaveLength(10)
    })

    it('rejects unknown query parameters with the error shape', async () => {
        const res = await request(app).get('/api/geocode').query({ q: 'Kyiv', extra: '1' })

        expect(res.status).toBe(400)
        expect(res.body.error.code).toBe('invalid_request')
    })

    it('rejects a malformed JSON body', async () => {
        const res = await request(app).post('/api/cities/track').set('Content-Type', 'application/json').send('{')

        expect(res.status).toBe(400)
        expect(res.body.error.code).toBe('invalid_json')
    })

    it('answers unknown routes with 404', async () => {
        const res = await request(app).get('/api/nope')

        expect(res.status).toBe(404)
        expect(res.body.error.code).toBe('not_found')
    })

    it('reports the caller quota without caching it', async () => {
        const res = await request(app).get('/api/quota')

        expect(res.status).toBe(200)
        expect(res.headers['cache-control']).toBe('no-store')
        expect(res.body).toMatchObject({ limit: 60, used: 0 })
    })

    it('keys clients by the CloudFront viewer address when present', async () => {
        const res = await request(app).get('/api/quota').set('CloudFront-Viewer-Address', '203.0.113.7:51234')

        expect(res.status).toBe(200)
    })
})

describe.runIf(Boolean(process.env.DATABASE_URL))('API with the database', () => {
    it('lists the seed cities and reports health', async () => {
        const cities = await request(app).get('/api/cities')
        const health = await request(app).get('/api/health')

        expect(cities.status).toBe(200)
        expect(cities.body.items.length).toBeGreaterThanOrEqual(11)
        expect(health.body).toMatchObject({ ok: true })
    })

    it('answers an unknown city with 404', async () => {
        const res = await request(app).get('/api/cities/nowhere-xx-1/latest').query({ variable: 'temp' })

        expect(res.status).toBe(404)
        expect(res.body.error.code).toBe('city_not_found')
    })
})

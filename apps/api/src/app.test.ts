import { loadLocalEnv } from '@fa/db/client'
import request from 'supertest'
import { createApp } from './app'

loadLocalEnv()

const app = createApp({ isLoggingRequests: false })

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

    it('rejects an oversized body with 413, not as an upstream failure', async () => {
        const body = JSON.stringify({ geocodeId: 1, padding: 'x'.repeat(20_000) })
        const res = await request(app).post('/api/cities/track').set('Content-Type', 'application/json').send(body)

        expect(res.status).toBe(413)
        expect(res.body.error.code).toBe('invalid_request')
    })

    it('rejects a geocoding id beyond the database column before touching it', async () => {
        const res = await request(app).post('/api/cities/track').send({ geocodeId: 3_000_000_000 })

        expect(res.status).toBe(400)
        expect(res.body.error.code).toBe('invalid_request')
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
    it('reports health with the seed cities stored', async () => {
        const health = await request(app).get('/api/health')

        expect(health.status).toBe(200)
        expect(health.body.ok).toBe(true)
        expect(health.body.cities).toBeGreaterThanOrEqual(11)
    })

    it('answers an unknown city with 404', async () => {
        const res = await request(app).get('/api/cities/nowhere-xx-1/latest').query({ variable: 'temp' })

        expect(res.status).toBe(404)
        expect(res.body.error.code).toBe('city_not_found')
    })
})

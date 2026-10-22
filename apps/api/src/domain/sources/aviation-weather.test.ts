import { fetchObservations } from './aviation-weather'

const REPORT = {
    icaoId: 'EGLC',
    name: 'London City Arpt, EN, GB',
    obsTime: 1_792_682_400,
    temp: 15,
    lat: 51.505,
    lon: 0.055,
    elev: 10,
}

const respond = (status: number, body?: unknown) =>
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(body ? JSON.stringify(body) : null, { status }))

describe('fetchObservations', () => {
    afterEach(() => vi.restoreAllMocks())

    it('asks for a box around the place and reads each report with a temperature', async () => {
        const fetchSpy = respond(200, [REPORT, { ...REPORT, icaoId: 'EGKB', temp: null }])

        const observations = await fetchObservations({ lat: 51.51, lon: -0.13 }, 25)

        expect(String(fetchSpy.mock.calls[0][0])).toContain('/api/data/metar?bbox=51.285%2C-0.491%2C51.735%2C0.231')
        expect(observations).toEqual([
            {
                station: 'EGLC',
                name: 'London City Arpt, EN, GB',
                observedAt: new Date('2026-10-22T15:20:00Z'),
                temp: 15,
                position: { lat: 51.505, lon: 0.055 },
                elevationM: 10,
            },
        ])
    })

    it('reads a box without stations, answered with 204 and no body, as none', async () => {
        respond(204)

        expect(await fetchObservations({ lat: 49.99, lon: 36.23 }, 25)).toEqual([])
    })
})

// Stands in for Open-Meteo (forecast and geocoding) and met.no during end-to-end tests. It replays the recorded
// New York responses for any location, shifted so their hours line up with today, so the app's collector and
// preview path run for real without touching the network.
import { readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import path from 'node:path'

const PORT = Number(process.env.FAKE_UPSTREAM_PORT ?? 4010)
const UPSTREAM = path.resolve(import.meta.dirname, '../../packages/fixtures/upstream')
const OPEN_METEO = JSON.parse(readFileSync(path.join(UPSTREAM, 'open-meteo-new-york-20260924T1200Z.json'), 'utf8'))[0]
const METNO = JSON.parse(readFileSync(path.join(UPSTREAM, 'metno-new-york-20260924T1200Z.json'), 'utf8'))
const HOUR_MS = 3_600_000
const DAY_MS = 24 * HOUR_MS

// One untracked place, so the search-and-track flow creates a new city.
export const PLACE = {
    id: 689558,
    name: 'Vinnytsia',
    latitude: 49.23278,
    longitude: 28.48097,
    elevation: 298,
    country_code: 'UA',
    country: 'Ukraine',
    admin1: 'Vinnytsia Oblast',
    timezone: 'Europe/Kyiv',
    population: 352115,
}

const toOpenMeteoTime = (ms) => new Date(ms).toISOString().slice(0, 16)

// The recording starts at midnight one day before its run, like a live `past_days=1` request.
const openMeteoFor = (lat, lon) => {
    const start = Math.floor(Date.now() / DAY_MS) * DAY_MS - DAY_MS
    const time = OPEN_METEO.hourly.time.map((_, i) => toOpenMeteoTime(start + i * HOUR_MS))

    return { ...OPEN_METEO, latitude: lat, longitude: lon, hourly: { ...OPEN_METEO.hourly, time } }
}

const metnoNow = () => {
    const first = new Date(METNO.properties.timeseries[0].time).getTime()
    const shift = Math.floor(Date.now() / HOUR_MS) * HOUR_MS - first
    const timeseries = METNO.properties.timeseries.map((entry) => ({
        ...entry,
        time: new Date(new Date(entry.time).getTime() + shift).toISOString().replace('.000Z', 'Z'),
    }))

    return { ...METNO, properties: { ...METNO.properties, timeseries } }
}

const send = (res, status, body, headers = {}) => {
    res.writeHead(status, { 'Content-Type': 'application/json', ...headers })
    res.end(JSON.stringify(body))
}

createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`)
    const numbers = (name) => (url.searchParams.get(name) ?? '').split(',').filter(Boolean).map(Number)

    if (url.pathname === '/v1/forecast') {
        const lats = numbers('latitude')
        const lons = numbers('longitude')

        return send(
            res,
            200,
            lats.map((lat, i) => openMeteoFor(lat, lons[i])),
        )
    }

    if (url.pathname === '/v1/search') {
        const name = (url.searchParams.get('name') ?? '').toLowerCase()

        return send(res, 200, PLACE.name.toLowerCase().startsWith(name) ? { results: [PLACE] } : {})
    }

    if (url.pathname === '/v1/get') return send(res, 200, PLACE)

    if (url.pathname.startsWith('/weatherapi/locationforecast')) {
        return send(res, 200, metnoNow(), { 'Last-Modified': new Date().toUTCString() })
    }

    send(res, 404, { error: `fake upstream has no ${url.pathname}` })
}).listen(PORT, () => console.log(`Fake upstream on http://localhost:${PORT}`))

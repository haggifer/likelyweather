import { handle, json, parseQuery } from '@/server/http'
import { searchPlaces } from '@/server/sources/geocoding'
import { GeocodeQuerySchema, GeocodeResponse } from '@/shared/api'

export const GET = handle('geocode', async (req) => {
    const { q, locale } = parseQuery(req, GeocodeQuerySchema)
    const results = await searchPlaces(q, locale ?? 'en')

    return json({ results } satisfies GeocodeResponse)
})

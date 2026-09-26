import { getClientIp, handle, json, parseQuery } from '@/server/http'
import { quotaExceeded, trySpendQuota } from '@/server/quota'
import { searchPlaces } from '@/server/sources/geocoding'
import { DEFAULT_LOCALE, GeocodeQuerySchema, GeocodeResponse } from '@fa/shared/api'

export const GET = handle('geocode', async (req) => {
    const { q, locale } = parseQuery(req, GeocodeQuerySchema)
    const client = getClientIp(req)
    const results = await searchPlaces(q, locale ?? DEFAULT_LOCALE, () => {
        if (!trySpendQuota(client)) throw quotaExceeded()
    })

    return json({ results } satisfies GeocodeResponse)
})

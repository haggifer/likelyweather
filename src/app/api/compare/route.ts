import { ensureFreshSnapshot, requireCity } from '@/server/cities'
import { getClientIp, handle, json, parseQuery } from '@/server/http'
import { toLatestResponse } from '@/server/latest'
import { CompareQuerySchema, CompareResponse } from '@/shared/api'

export const GET = handle('read', async (req) => {
    const { cities, variable } = parseQuery(req, CompareQuerySchema)
    const items = await Promise.all(
        cities.map(async (slug) => {
            const city = await requireCity(slug)
            const snapshot = await ensureFreshSnapshot(city, getClientIp(req)).catch(() => null)

            return { city, latest: snapshot ? toLatestResponse(snapshot, variable) : null }
        }),
    )

    return json({ items } satisfies CompareResponse)
})

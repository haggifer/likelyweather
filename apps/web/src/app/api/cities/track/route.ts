import { ensureFreshSnapshot, getPreviewRunId, trackCity } from '@/server/cities'
import { getClientIp, handle, json, parseBody } from '@/server/http'
import { TrackBodySchema, TrackResponse } from '@/shared/api'
import { after } from 'next/server'

export const POST = handle('track', async (req) => {
    const { geocodeId } = await parseBody(req, TrackBodySchema)
    const city = await trackCity(geocodeId)

    const client = getClientIp(req)

    after(() => ensureFreshSnapshot(city, client).catch((error) => console.error(error)))

    const body: TrackResponse = { slug: city.slug, status: city.status, previewRunId: getPreviewRunId(city) }

    return json(body, { cache: false })
})

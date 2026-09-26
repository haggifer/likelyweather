import { ensureFreshSnapshot, requireCity } from '@/server/cities'
import { getClientIp, handle, json, parseQuery } from '@/server/http'
import { toLatestResponse } from '@/server/latest'
import { LatestQuerySchema } from '@fa/shared/api'

export const GET = handle('read', async (req, ctx: RouteContext<'/api/cities/[slug]/latest'>) => {
    const { slug } = await ctx.params
    const { variable } = parseQuery(req, LatestQuerySchema)
    const snapshot = await ensureFreshSnapshot(await requireCity(slug), getClientIp(req))

    return json(toLatestResponse(snapshot, variable))
})

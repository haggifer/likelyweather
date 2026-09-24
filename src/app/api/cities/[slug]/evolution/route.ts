import { getEvolution } from '@/server/analysis'
import { requireCity } from '@/server/cities'
import { handle, json, parseQuery } from '@/server/http'
import { EvolutionQuerySchema } from '@/shared/api'

export const GET = handle('read', async (req, ctx: RouteContext<'/api/cities/[slug]/evolution'>) => {
    const { slug } = await ctx.params
    const { variable, validTime } = parseQuery(req, EvolutionQuerySchema)

    return json(await getEvolution(await requireCity(slug), variable, validTime))
})

import { getScoreboard } from '@/server/analysis'
import { requireCity } from '@/server/cities'
import { handle, json, parseQuery } from '@/server/http'
import { ScoreboardQuerySchema } from '@/shared/api'

export const GET = handle('read', async (req, ctx: RouteContext<'/api/cities/[slug]/scoreboard'>) => {
    const { slug } = await ctx.params
    const { variable, window, mode } = parseQuery(req, ScoreboardQuerySchema)

    return json(await getScoreboard(await requireCity(slug), variable, window, mode))
})

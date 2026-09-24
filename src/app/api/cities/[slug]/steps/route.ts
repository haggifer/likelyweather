import { requireCity } from '@/server/cities'
import { getEvolutionSteps } from '@/server/evolution'
import { handle, json } from '@/server/http'
import { StepsResponse } from '@/shared/api'

export const GET = handle('read', async (_req, ctx: RouteContext<'/api/cities/[slug]/steps'>) => {
    const { slug } = await ctx.params
    await requireCity(slug)

    return json({ steps: getEvolutionSteps() } satisfies StepsResponse)
})

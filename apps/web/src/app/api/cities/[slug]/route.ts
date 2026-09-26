import { recordView, requireCity, toCityDetail } from '@/server/cities'
import { handle, json } from '@/server/http'

export const GET = handle('read', async (_req, ctx: RouteContext<'/api/cities/[slug]'>) => {
    const { slug } = await ctx.params
    const city = (await recordView(slug)) ?? (await requireCity(slug))

    return json(await toCityDetail(city), { cache: false })
})

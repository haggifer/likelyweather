import { getModelDetail, pickModelDetailCities } from '@/server/analysis'
import { HttpError } from '@/server/errors'
import { handle, json, parseQuery } from '@/server/http'
import { getCities } from '@/server/store'
import { CityStatus, ModelDetailQuerySchema, ModelIdSchema } from '@/shared/api'

export const GET = handle('read', async (req, ctx: RouteContext<'/api/models/[id]'>) => {
    const { id } = await ctx.params
    const modelId = ModelIdSchema.safeParse(id)

    if (!modelId.success) throw new HttpError(404, 'model_not_found', `Unknown model "${id}"`)

    const { variable, window, city } = parseQuery(req, ModelDetailQuerySchema)
    const active = (await getCities()).filter((c) => c.status === CityStatus.Active)

    return json(await getModelDetail(modelId.data, pickModelDetailCities(active, city), variable, window))
})

import { handle, json, parseQuery } from '@/server/http'
import { getCities } from '@/server/store'
import { CityStatus, PopularQuerySchema } from '@/shared/api'
import { sortBy } from 'es-toolkit'

export const GET = handle('read', async (req) => {
    const { limit } = parseQuery(req, PopularQuerySchema)
    const viewed = (await getCities()).filter((c) => c.status === CityStatus.Active && c.viewCount > 0)

    return json(sortBy(viewed, [(c) => -c.viewCount]).slice(0, limit), { cache: false })
})

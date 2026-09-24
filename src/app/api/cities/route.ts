import { handle, json, parseQuery } from '@/server/http'
import { getCities } from '@/server/store'
import { CitiesQuerySchema } from '@/shared/api'

export const GET = handle('read', async (req) => {
    const { status } = parseQuery(req, CitiesQuerySchema)
    const cities = await getCities()

    return json({ items: status ? cities.filter((c) => c.status === status) : cities }, { cache: false })
})

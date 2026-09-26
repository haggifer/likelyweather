import { handle, json, parseQuery } from '@/server/http'
import { getRuns } from '@/server/store'
import { RunsQuerySchema, RunsResponse } from '@fa/shared/api'

export const GET = handle('read', async (req) => {
    const { limit, cursor } = parseQuery(req, RunsQuerySchema)
    const runs = await getRuns()
    const start = cursor ? runs.findIndex((r) => r.id === cursor) + 1 : 0
    const items = runs.slice(start, start + limit)
    const nextCursor = runs[start + limit] ? items.at(-1)?.id : undefined

    return json({ items, nextCursor } satisfies RunsResponse, { cache: false })
})

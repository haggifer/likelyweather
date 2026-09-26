import { handle, json, parseQuery } from '@/server/http'
import { getRuns } from '@/server/store'
import { TimelineQuerySchema, TimelineResponse } from '@fa/shared/api'
import { toIsoMinute } from '@fa/shared/time'

const DAY_MS = 86_400_000

export const GET = handle('read', async (req) => {
    const { days } = parseQuery(req, TimelineQuerySchema)
    const to = new Date()
    const from = new Date(to.getTime() - days * DAY_MS)
    const runs = (await getRuns())
        .filter((r) => new Date(r.issueTime) >= from)
        .map(({ id, issueTime, status, origin }) => ({ id, issueTime, status, origin }))

    return json({ from: toIsoMinute(from), to: toIsoMinute(to), runs } satisfies TimelineResponse, { cache: false })
})

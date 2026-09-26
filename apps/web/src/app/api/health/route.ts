import { handle, json } from '@/server/http'
import { getCities, getRuns } from '@/server/store'
import { CityStatus, HealthResponse } from '@/shared/api'

export const GET = handle('read', async () => {
    const [cities, runs] = await Promise.all([getCities(), getRuns()])
    const latestIssueTime = runs
        .filter((r) => r.status !== 'FAILED')
        .map((r) => r.issueTime)
        .sort()
        .at(-1)
    const lagMinutes = latestIssueTime ? Math.round((Date.now() - new Date(latestIssueTime).getTime()) / 60_000) : null
    const body: HealthResponse = {
        ok: true,
        latestIssueTime: latestIssueTime ?? null,
        lagMinutes,
        activeCities: cities.filter((c) => c.status === CityStatus.Active).length,
    }

    return json(body, { cache: false })
})

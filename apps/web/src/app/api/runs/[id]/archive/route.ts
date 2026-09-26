import { HttpError } from '@/server/errors'
import { handle } from '@/server/http'
import { getRuns, readRawDir } from '@/server/store'

// Local stand-in for the presigned S3 GET: returns the run's raw upstream responses as one JSON document.
export const GET = handle('read', async (_req, ctx: RouteContext<'/api/runs/[id]/archive'>) => {
    const { id } = await ctx.params
    const run = (await getRuns()).find((r) => r.id === id)

    if (!run) throw new HttpError(404, 'run_not_found', `No run "${id}"`)

    const files = await readRawDir(run.id)

    return new Response(JSON.stringify({ run, files }, null, 2), {
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Disposition': `inline; filename="${run.id}.json"`,
            'Cache-Control': 'public, max-age=300',
        },
    })
})

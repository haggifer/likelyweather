import { loadSecrets } from '@fa/server/secrets'

type RunScheduled = typeof import('@fa/server/scheduled').runScheduled

let runScheduled: RunScheduled | undefined

// EventBridge Scheduler invokes this every 6 hours. A FAILED run throws, so the scheduler retries it and, after
// the retries, the event lands in the dead-letter queue that raises the alarm. PARTIAL runs succeed.
export const handler = async () => {
    if (!runScheduled) {
        // Secrets first: the collector's modules read process.env when they load.
        await loadSecrets()

        const scheduled = await import('@fa/server/scheduled')

        runScheduled = scheduled.runScheduled
    }

    const result = await runScheduled({ log: (m) => console.log(m) })

    if (result?.run.status === 'FAILED') {
        throw new Error(`Collector run ${result.run.id} failed: ${result.run.warnings.join('; ')}`)
    }

    return result && { id: result.run.id, status: result.run.status, rows: result.run.rows }
}

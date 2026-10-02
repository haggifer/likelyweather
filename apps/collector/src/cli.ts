// Local entry for the scheduled collector; the Lambda handler runs the same `runScheduled`.
// Usage: pnpm collect [--cities kharkiv-ua-706483,kyiv-ua-703448] [--loop]
import { closeCache } from '@fa/server/cache'
import { runScheduled } from '@fa/server/scheduled'
import { parseArgs } from 'node:util'

const STEP_MS = 6 * 3_600_000
const LOOP_DELAY_AFTER_RUN_MS = 5 * 60_000

const { values } = parseArgs({
    args: process.argv.slice(2).filter((arg) => arg !== '--'),
    options: { cities: { type: 'string' }, loop: { type: 'boolean', default: false } },
})

const runOnce = async () => {
    const result = await runScheduled({ slugs: values.cities?.split(',').filter(Boolean), log: (m) => console.log(m) })

    result?.run.warnings.forEach((w) => console.warn(`WARN ${w}`))
}

// Five minutes after the next 00/06/12/18 UTC run is issued.
const getNextRunDelay = () => Math.ceil(Date.now() / STEP_MS) * STEP_MS + LOOP_DELAY_AFTER_RUN_MS - Date.now()

const main = async () => {
    await runOnce()

    while (values.loop) {
        const delay = getNextRunDelay()

        console.log(`Next run in ${Math.round(delay / 60_000)} min`)
        await new Promise((resolve) => setTimeout(resolve, delay))
        await runOnce()
    }
}

main()
    .catch((error) => {
        console.error(error)
        process.exitCode = 1
    })
    .finally(() => closeCache())

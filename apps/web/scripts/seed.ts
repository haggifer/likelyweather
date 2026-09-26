// Seeds the starter cities (src/shared/seeds.ts) into the local store. --force replaces the tracked-city list.
import { rm } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'

try {
    process.loadEnvFile('.env.local')
} catch {
    console.warn('No .env.local found; using defaults')
}

const { values } = parseArgs({
    args: process.argv.slice(2).filter((arg) => arg !== '--'),
    options: { force: { type: 'boolean', default: false } },
})

const main = async () => {
    const { env } = await import('@/server/env')
    const { getCities } = await import('@/server/store')

    if (values.force) await rm(path.join(env.DATA_DIR, 'cities.json'), { force: true })

    const cities = await getCities()
    console.log(`${cities.length} tracked cities in ${env.DATA_DIR}`)
    cities.forEach((c) => console.log(`  ${c.status.padEnd(8)} ${c.slug}`))
}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})

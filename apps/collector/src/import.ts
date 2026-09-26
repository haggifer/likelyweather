// Ingests CSVs from the reference Python collector as IMPORT runs.
// Usage: pnpm import:csv -- ./packages/fixtures/csv/*.csv   (plain .csv or .csv.gz)
import { getPrisma } from '@fa/db/client'
import { closeCache } from '@fa/server/cache'
import { importForecastCsv, parseForecastCsv } from '@fa/server/importCsv'
import { getCities } from '@fa/server/store'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { gunzipSync } from 'node:zlib'

const main = async () => {
    const files = process.argv.slice(2).filter((arg) => arg !== '--')

    if (!files.length) throw new Error('Usage: pnpm import:csv -- <file.csv|file.csv.gz> [...]')

    const cities = await getCities()

    for (const file of files) {
        // Paths are relative to where `pnpm` was started, not to this package.
        const raw = await readFile(path.resolve(process.env.INIT_CWD ?? process.cwd(), file))
        const text = file.endsWith('.gz') ? gunzipSync(raw).toString('utf8') : raw.toString('utf8')
        const name = path.basename(file)
        const run = await importForecastCsv(parseForecastCsv(text, name, cities), name)
        console.log(`${name}: ${run.id}, ${run.rows} rows, ${run.citiesCount} cities`)
        run.warnings.forEach((w) => console.warn(`WARN ${w}`))
    }
}

main()
    .catch((error) => {
        console.error(error)
        process.exitCode = 1
    })
    .finally(async () => {
        await closeCache()
        await getPrisma().$disconnect()
    })

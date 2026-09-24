// CI assertion from guide §12: a production build (NEXT_PUBLIC_THEME_LAB=0) must not ship the Theme Lab panel,
// its gallery, or the gallery's static data dump. Run after `next build`.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

const MARKERS = ['Compare complete designs on the real screens', 'Theme Lab gallery', '"runId":"lab-dump"']
const root = path.resolve('.next/static')

const walk = (dir) =>
    readdirSync(dir).flatMap((name) => {
        const file = path.join(dir, name)
        return statSync(file).isDirectory() ? walk(file) : [file]
    })

const offenders = walk(root).filter(
    (file) => file.endsWith('.js') && MARKERS.some((m) => readFileSync(file, 'utf8').includes(m)),
)

if (offenders.length) {
    console.error(`Theme Lab code found in the production bundle:\n${offenders.join('\n')}`)
    process.exit(1)
}

console.log('OK: no Theme Lab panel, gallery or dump in .next/static')

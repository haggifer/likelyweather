// CI assertion from guide §12: a production build (NEXT_PUBLIC_THEME_LAB=0) must not ship the Theme Lab panel.
// Run after `next build`. Matches a string that only exists in ThemeLabPanel.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

const MARKER = 'Compare complete designs on the real screens'
const root = path.resolve('.next/static')

const walk = (dir) =>
    readdirSync(dir).flatMap((name) => {
        const file = path.join(dir, name)
        return statSync(file).isDirectory() ? walk(file) : [file]
    })

const offenders = walk(root).filter((file) => file.endsWith('.js') && readFileSync(file, 'utf8').includes(MARKER))

if (offenders.length) {
    console.error(`Theme Lab panel found in the production bundle:\n${offenders.join('\n')}`)
    process.exit(1)
}

console.log('OK: no Theme Lab panel in .next/static')

// Emoji flags look different on every platform, so the app shows country-flag-icons' 3x2 SVGs (MIT). Only the SVGs
// are copied: the package's flags.css and flags.zip would ship unused.
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(import.meta.url)
const source = path.join(path.dirname(require.resolve('country-flag-icons/package.json')), '3x2')
const target = path.resolve('public/flags')

mkdirSync(target, { recursive: true })

for (const file of readdirSync(source).filter((name) => name.endsWith('.svg'))) {
    copyFileSync(path.join(source, file), path.join(target, file))
}

console.log(`Copied flags to ${target}`)

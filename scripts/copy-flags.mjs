// Copies the MIT-licensed country-flag-icons 3x2 SVGs into public/flags (guide §4.6: flags are SVG assets, not emoji).
import { cpSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(import.meta.url)
const source = path.join(path.dirname(require.resolve('country-flag-icons/package.json')), '3x2')
const target = path.resolve('public/flags')

mkdirSync(target, { recursive: true })
cpSync(source, target, { recursive: true })
console.log(`Copied flags to ${target}`)

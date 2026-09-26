// Fails when the five message catalogs disagree on their keys, or when code uses a literal key that the English
// catalog lacks. Keys built at runtime (template literals) are not checked.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const CATALOG_DIR = path.join(ROOT, 'apps/web/messages')
const LOCALES = ['en', 'uk', 'es', 'de', 'fr']
const SOURCE_DIRS = ['apps/web/src', 'packages/charts/src', 'packages/ui/src'].map((d) => path.join(ROOT, d))
const BINDING = /(?:const|let)\s+(\w+)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*(?:'([\w.]+)')?\s*\)/g

const flatten = (object, prefix = '') =>
    Object.entries(object).flatMap(([key, value]) =>
        value && typeof value === 'object' ? flatten(value, `${prefix}${key}.`) : [`${prefix}${key}`],
    )

const walk = (dir) =>
    readdirSync(dir).flatMap((name) => {
        const file = path.join(dir, name)

        if (statSync(file).isDirectory()) return name === 'node_modules' ? [] : walk(file)

        return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [file] : []
    })

const problems = []
const catalogs = Object.fromEntries(
    LOCALES.map((locale) => [
        locale,
        new Set(flatten(JSON.parse(readFileSync(path.join(CATALOG_DIR, `${locale}.json`), 'utf8')))),
    ]),
)

for (const locale of LOCALES.slice(1)) {
    for (const key of catalogs.en) if (!catalogs[locale].has(key)) problems.push(`${locale}.json is missing ${key}`)
    for (const key of catalogs[locale])
        if (!catalogs.en.has(key)) problems.push(`${locale}.json has ${key}, which en.json lacks`)
}

let checked = 0

for (const file of SOURCE_DIRS.flatMap(walk)) {
    const text = readFileSync(file, 'utf8')

    for (const [, name, namespace] of text.matchAll(BINDING)) {
        const call = new RegExp(`\\b${name}(?:\\.(?:rich|markup|raw|has))?\\(\\s*'([\\w.]+)'`, 'g')

        for (const [, key] of text.matchAll(call)) {
            const full = namespace ? `${namespace}.${key}` : key
            checked++

            // A key may name a subtree used with `t.raw`, so a prefix of existing keys also counts.
            if (!catalogs.en.has(full) && ![...catalogs.en].some((k) => k.startsWith(`${full}.`))) {
                problems.push(`${path.relative(ROOT, file)} uses ${full}, which en.json lacks`)
            }
        }
    }
}

if (problems.length) {
    console.error(problems.join('\n'))
    process.exit(1)
}

console.log(`Messages OK: ${catalogs.en.size} keys in ${LOCALES.length} catalogs, ${checked} literal uses checked`)

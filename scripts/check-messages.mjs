// Fails when the five message catalogs disagree on their keys, or when code uses a literal key that the English
// catalog lacks. Keys built at runtime (template literals) are not checked.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const CATALOG_DIR = path.join(ROOT, 'packages/messages/catalogs')
const LOCALES = ['en', 'uk', 'es', 'de', 'fr']
const SOURCE_DIRS = ['apps/web/src', 'apps/mobile/src', 'packages/charts/src', 'packages/ui/src'].map((d) => path.join(ROOT, d))
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

const readCatalog = (locale) =>
    new Set(flatten(JSON.parse(readFileSync(path.join(CATALOG_DIR, `${locale}.json`), 'utf8'))))

const findParityProblems = (catalogs) =>
    LOCALES.slice(1).flatMap((locale) => [
        ...[...catalogs.en]
            .filter((key) => !catalogs[locale].has(key))
            .map((key) => `${locale}.json is missing ${key}`),
        ...[...catalogs[locale]]
            .filter((key) => !catalogs.en.has(key))
            .map((key) => `${locale}.json has ${key}, which en.json lacks`),
    ])

// Every literal key passed to a translator bound in `file`, prefixed with the translator's namespace.
const findLiteralKeys = (file) => {
    const text = readFileSync(file, 'utf8')

    return [...text.matchAll(BINDING)].flatMap(([, name, namespace]) => {
        const call = new RegExp(`\\b${name}(?:\\.(?:rich|markup|raw|has))?\\(\\s*'([\\w.]+)'`, 'g')

        return [...text.matchAll(call)].map(([, key]) => (namespace ? `${namespace}.${key}` : key))
    })
}

// A key may name a subtree used with `t.raw`, so a prefix of existing keys also counts.
const isKnownKey = (catalog, key) => catalog.has(key) || [...catalog].some((k) => k.startsWith(`${key}.`))

const catalogs = Object.fromEntries(LOCALES.map((locale) => [locale, readCatalog(locale)]))
const uses = SOURCE_DIRS.flatMap(walk).flatMap((file) => findLiteralKeys(file).map((key) => ({ file, key })))
const problems = [
    ...findParityProblems(catalogs),
    ...uses
        .filter(({ key }) => !isKnownKey(catalogs.en, key))
        .map(({ file, key }) => `${path.relative(ROOT, file)} uses ${key}, which en.json lacks`),
]

if (problems.length) {
    console.error(problems.join('\n'))
    process.exit(1)
}

console.log(`Messages OK: ${catalogs.en.size} keys in ${LOCALES.length} catalogs, ${uses.length} literal uses checked`)

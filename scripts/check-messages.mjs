// Fails when the five message catalogs disagree on their keys or on the ICU arguments and tags a message needs, or
// when code uses a literal key that the English catalog lacks. Keys built at runtime (template literals) are not
// checked.
import { parse, TYPE } from '@formatjs/icu-messageformat-parser'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const CATALOG_DIR = path.join(ROOT, 'packages/messages/catalogs')
const LOCALES = ['en', 'uk', 'es', 'de', 'fr']
const SOURCE_DIRS = ['apps/web/src', 'apps/mobile/src', 'packages/ui/src'].map((d) => path.join(ROOT, d))
const BINDING = /(?:const|let)\s+(\w+)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*(?:'([\w.]+)')?\s*\)/g

// Every argument and tag a message needs: `{name}`, `{count, plural, …}` (and the arguments inside its options),
// `<link>…</link>`. A translation that drops or renames one passes a key check and fails at runtime. A regex could not
// tell an argument from a plural option's text, so messages go through the parser next-intl itself uses.
const collectArguments = (elements, found = new Set()) => {
    for (const element of elements) {
        if ('value' in element && element.type !== TYPE.literal && element.type !== TYPE.pound) found.add(element.value)

        if (element.type === TYPE.tag) collectArguments(element.children, found)

        if ('options' in element) {
            for (const option of Object.values(element.options)) collectArguments(option.value, found)
        }
    }

    return found
}

// A message the parser rejects is reported by next-intl at runtime already; here it simply has no arguments.
const getArguments = (message) => {
    try {
        return [...collectArguments(parse(String(message)))].sort()
    } catch {
        return []
    }
}

const flatten = (object, prefix = '') =>
    Object.entries(object).flatMap(([key, value]) =>
        value && typeof value === 'object'
            ? flatten(value, `${prefix}${key}.`)
            : [[`${prefix}${key}`, getArguments(value)]],
    )

const walk = (dir) =>
    readdirSync(dir).flatMap((name) => {
        const file = path.join(dir, name)

        if (statSync(file).isDirectory()) return name === 'node_modules' ? [] : walk(file)

        return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [file] : []
    })

const readCatalog = (locale) =>
    new Map(flatten(JSON.parse(readFileSync(path.join(CATALOG_DIR, `${locale}.json`), 'utf8'))))

const hasOtherArguments = (catalog, key, args) => catalog.has(key) && catalog.get(key).join() !== args.join()

const findParityProblems = (catalogs) =>
    LOCALES.slice(1).flatMap((locale) => [
        ...[...catalogs.en.keys()]
            .filter((key) => !catalogs[locale].has(key))
            .map((key) => `${locale}.json is missing ${key}`),
        ...[...catalogs[locale].keys()]
            .filter((key) => !catalogs.en.has(key))
            .map((key) => `${locale}.json has ${key}, which en.json lacks`),
        ...[...catalogs.en]
            .filter(([key, args]) => hasOtherArguments(catalogs[locale], key, args))
            .map(
                ([key, args]) =>
                    `${locale}.json ${key} needs {${args.join(', ')}}, has {${catalogs[locale].get(key).join(', ')}}`,
            ),
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
const isKnownKey = (catalog, key) => catalog.has(key) || [...catalog.keys()].some((k) => k.startsWith(`${key}.`))

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

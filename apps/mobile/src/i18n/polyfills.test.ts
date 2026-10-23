import { LOCALES } from '@fa/shared/api'
import { readFileSync } from 'fs'
import { join } from 'path'

// Under Jest, Node's own Intl answers, so only the source can show whether Hermes gets every language's data. A
// language missing here falls back to another one's names, such as Ukrainian country names in Russian.
const SOURCE = readFileSync(join(__dirname, 'polyfills.ts'), 'utf8')
const POLYFILLS = ['intl-pluralrules', 'intl-relativetimeformat', 'intl-displaynames']

describe('Intl polyfills', () => {
    it.each(POLYFILLS)('load %s data for every language of the app', (polyfill) => {
        const missing = LOCALES.filter((locale) => !SOURCE.includes(`@formatjs/${polyfill}/locale-data/${locale}.js`))

        expect(missing).toEqual([])
    })
})

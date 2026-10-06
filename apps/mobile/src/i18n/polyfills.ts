// organize-imports-ignore
// Hermes implements only Intl.Collator, DateTimeFormat and NumberFormat; use-intl and the shared formatters also need Locale, PluralRules, DisplayNames (country names) and
// RelativeTimeFormat. Each polyfill installs itself only where the engine lacks the API, and its locale data must be
// imported after it, so this file keeps its import order.
import '@formatjs/intl-locale/polyfill.js'
import '@formatjs/intl-pluralrules/polyfill.js'
import '@formatjs/intl-pluralrules/locale-data/de.js'
import '@formatjs/intl-pluralrules/locale-data/en.js'
import '@formatjs/intl-pluralrules/locale-data/es.js'
import '@formatjs/intl-pluralrules/locale-data/fr.js'
import '@formatjs/intl-pluralrules/locale-data/uk.js'
import '@formatjs/intl-relativetimeformat/polyfill.js'
import '@formatjs/intl-relativetimeformat/locale-data/de.js'
import '@formatjs/intl-relativetimeformat/locale-data/en.js'
import '@formatjs/intl-relativetimeformat/locale-data/es.js'
import '@formatjs/intl-relativetimeformat/locale-data/fr.js'
import '@formatjs/intl-relativetimeformat/locale-data/uk.js'
import '@formatjs/intl-displaynames/polyfill.js'
import '@formatjs/intl-displaynames/locale-data/de.js'
import '@formatjs/intl-displaynames/locale-data/en.js'
import '@formatjs/intl-displaynames/locale-data/es.js'
import '@formatjs/intl-displaynames/locale-data/fr.js'
import '@formatjs/intl-displaynames/locale-data/uk.js'

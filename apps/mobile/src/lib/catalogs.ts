import de from '@fa/messages/catalogs/de.json'
import en from '@fa/messages/catalogs/en.json'
import es from '@fa/messages/catalogs/es.json'
import fr from '@fa/messages/catalogs/fr.json'
import ru from '@fa/messages/catalogs/ru.json'
import uk from '@fa/messages/catalogs/uk.json'
import type { Messages } from '@fa/messages/load'
import { Locale } from '@fa/shared/api'

// All the catalogs ship in the bundle: the language can change in Settings without a download.
export const CATALOGS: Record<Locale, Messages> = {
    [Locale.Uk]: uk,
    [Locale.En]: en,
    [Locale.Es]: es,
    [Locale.De]: de,
    [Locale.Fr]: fr,
    [Locale.Ru]: ru,
}

import de from '@fa/messages/catalogs/de.json'
import en from '@fa/messages/catalogs/en.json'
import es from '@fa/messages/catalogs/es.json'
import fr from '@fa/messages/catalogs/fr.json'
import uk from '@fa/messages/catalogs/uk.json'
import type { Messages } from '@fa/messages/load'
import { Locale } from '@fa/shared/api'
import { getLocales } from 'expo-localization'
import { Stack } from 'expo-router'
import { IntlProvider } from 'use-intl'
import { useTheme } from '../hooks/useTheme'
import { toLocale } from '../i18n/device-locale'

const CATALOGS: Record<Locale, Messages> = {
    [Locale.Uk]: uk,
    [Locale.En]: en,
    [Locale.Es]: es,
    [Locale.De]: de,
    [Locale.Fr]: fr,
}

// Settings will let the reader pick a language; until then the device's first language decides.
const LOCALE = toLocale(getLocales()[0]?.languageCode)

export default function RootLayout() {
    const { colors } = useTheme()

    return (
        <IntlProvider locale={LOCALE} messages={CATALOGS[LOCALE]}>
            <Stack
                screenOptions={{
                    headerStyle: { backgroundColor: colors.card },
                    headerTintColor: colors.foreground,
                    contentStyle: { backgroundColor: colors.background },
                }}
            />
        </IntlProvider>
    )
}

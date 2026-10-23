import { Locale } from './api'

// Endonyms: each language is listed in its own name, so a reader can always find theirs. The web's language menu and
// the app's Settings show the same names.
export const LANGUAGE_NAMES: Record<Locale, string> = {
    [Locale.En]: 'English',
    [Locale.Es]: 'Español',
    [Locale.De]: 'Deutsch',
    [Locale.Fr]: 'Français',
    [Locale.Ru]: 'Русский',
    [Locale.Uk]: 'Українська',
}

// Kept apart from the API schemas, so code that only needs the languages doesn't load zod in the browser.

// In the language menus' order: English first, Ukrainian last.
export enum Locale {
    En = 'en',
    Es = 'es',
    De = 'de',
    Fr = 'fr',
    Ru = 'ru',
    Uk = 'uk',
}

export const LOCALES: Locale[] = Object.values(Locale)
export const DEFAULT_LOCALE = Locale.En

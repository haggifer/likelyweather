// The site the app shares its API and its legal pages with. EXPO_PUBLIC_API_ORIGIN points a development build at
// another API (a local one through `adb reverse tcp:4000 tcp:4000`); the legal pages always come from the site.
const WEB_ORIGIN = 'https://dom3g5nxr3yi9.cloudfront.net'
export const API_ORIGIN = process.env.EXPO_PUBLIC_API_ORIGIN || WEB_ORIGIN
// Set when the repository is public, like the web footer's NEXT_PUBLIC_REPO_URL.
export const REPO_URL = process.env.EXPO_PUBLIC_REPO_URL || null
export const OPEN_METEO_URL = 'https://open-meteo.com/'
export const METNO_URL = 'https://api.met.no/'

// The site's chrome follows its own language cookie, which the browser opened from the app does not have, so the
// link names the app's language.
export const getLegalUrl = (page: 'privacy' | 'terms', locale: string) => `${WEB_ORIGIN}/${page}?lang=${locale}`

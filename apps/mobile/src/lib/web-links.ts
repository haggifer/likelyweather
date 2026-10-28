import { SITE_ORIGIN } from '@fa/shared/site'

// The app shares its API and its legal pages with the site. EXPO_PUBLIC_API_ORIGIN points a development build at
// another API (a local one through `adb reverse tcp:4000 tcp:4000`); the legal pages always come from the site.
export const API_ORIGIN = process.env.EXPO_PUBLIC_API_ORIGIN || SITE_ORIGIN
// Set when the repository is public, like the web footer's NEXT_PUBLIC_REPO_URL.
export const REPO_URL = process.env.EXPO_PUBLIC_REPO_URL || null

// The site's chrome follows its own language cookie, which the browser opened from the app does not have, so the
// link names the app's language.
export const getLegalUrl = (page: 'privacy' | 'terms', locale: string) => `${SITE_ORIGIN}/${page}?lang=${locale}`

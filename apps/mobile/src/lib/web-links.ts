// The site the app shares its API and its legal pages with. EXPO_PUBLIC_API_ORIGIN points a development build at
// another API (a local one through `adb reverse tcp:4000 tcp:4000`); the legal pages always come from the site.
const WEB_ORIGIN = 'https://dom3g5nxr3yi9.cloudfront.net'
export const API_ORIGIN = process.env.EXPO_PUBLIC_API_ORIGIN || WEB_ORIGIN
export const PRIVACY_URL = `${WEB_ORIGIN}/privacy`
export const TERMS_URL = `${WEB_ORIGIN}/terms`
// Set when the repository is public, like the web footer's NEXT_PUBLIC_REPO_URL.
export const REPO_URL = process.env.EXPO_PUBLIC_REPO_URL || null

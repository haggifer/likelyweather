import { configureApi } from '@fa/api-client/api'
import { CryptoDigestAlgorithm, digestStringAsync } from 'expo-crypto'
import { API_ORIGIN } from './web-links'

// Hermes has no crypto.subtle; CloudFront needs the SHA-256 of every POST body (origin access control). Imported by
// the entry, so the screens and the widget's background task both start configured.
configureApi({
    baseUrl: API_ORIGIN,
    sha256Hex: (text) => digestStringAsync(CryptoDigestAlgorithm.SHA256, text),
})

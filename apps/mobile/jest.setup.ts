// Node has the full Intl API, so the polyfills stay inactive here; importing them proves their paths resolve.
import './src/i18n/polyfills'

// MMKV swaps in an in-memory store under Jest, but importing it still loads its native layer, which has no module
// to bind to here; the layer is never called in tests.
jest.mock('react-native-nitro-modules', () => ({ NitroModules: { createHybridObject: jest.fn() } }))

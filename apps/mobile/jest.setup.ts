// Node has the full Intl API, so the polyfills stay inactive here; importing them proves their paths resolve.
import './src/i18n/polyfills'

// MMKV swaps in an in-memory store under Jest, but importing it still loads its native layer, which has no module
// to bind to here; the layer is never called in tests.
jest.mock('react-native-nitro-modules', () => ({ NitroModules: { createHybridObject: jest.fn() } }))

// Expo Router provides the safe-area context in the app; screens rendered alone get the library's zero insets.
jest.mock(
    'react-native-safe-area-context',
    () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
)

// Reanimated and its worklets runtime need native modules; the libraries' own mocks stand in for them in every test,
// since the kit's overlays animate through Reanimated.
jest.mock('react-native-worklets', () => jest.requireActual('react-native-worklets/src/mock'))
jest.mock('react-native-reanimated', () => jest.requireActual('react-native-reanimated/mock'))
jest.mock('react-native-gesture-handler/lib/commonjs/RNGestureHandlerModule', () =>
    jest.requireActual('react-native-gesture-handler/lib/commonjs/mocks/mocks'),
)

// Skia draws on a native GPU surface. Its drawing components stand in as plain views, so a chart's tree renders and
// its parts can be found and counted; fonts never load, so labels draw nothing.
jest.mock('@shopify/react-native-skia', () => {
    const { createElement } = jest.requireActual<typeof import('react')>('react')
    const { View } = jest.requireActual<typeof import('react-native')>('react-native')
    const Drawing = ({ testID, children }: { testID?: string; children?: import('react').ReactNode }) =>
        createElement(View, { testID }, children)

    return {
        Canvas: Drawing,
        Circle: Drawing,
        DashPathEffect: Drawing,
        Group: Drawing,
        Line: Drawing,
        Path: Drawing,
        Rect: Drawing,
        RoundedRect: Drawing,
        Text: Drawing,
        useFont: () => null,
        vec: (x: number, y: number) => ({ x, y }),
        rect: (x: number, y: number, width: number, height: number) => ({ x, y, width, height }),
        rrect: (rect: object, rx: number, ry: number) => ({ rect, rx, ry }),
    }
})

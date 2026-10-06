import { createMMKV } from 'react-native-mmkv'

// One synchronous key-value store for everything the app keeps on the device: settings, places, the query cache and
// the widgets' cities. The widget's background task reads the same store.
export const storage = createMMKV({ id: 'forecast-arena' })

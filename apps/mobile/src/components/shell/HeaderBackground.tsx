import { View } from 'react-native'

// The web top bar's bottom border. Android's native header can only cast an elevation shadow, so the header draws
// over this background instead.
export function HeaderBackground() {
    return <View className="flex-1 border-b border-border bg-card" />
}

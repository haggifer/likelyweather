import { ScrollView, ScrollViewProps, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

type IProps = ScrollViewProps

// Android draws the app edge to edge, under the navigation bar, so a screen's last rows end up behind its buttons
// unless the content is padded by the bar's height.
export function ScreenScroll({ contentContainerStyle, ...props }: IProps) {
    const insets = useSafeAreaInsets()

    const style = StyleSheet.flatten(contentContainerStyle) ?? {}
    const paddingBottom = Number(style.paddingBottom ?? style.paddingVertical ?? style.padding ?? 0) + insets.bottom

    return <ScrollView contentContainerStyle={[style, { paddingBottom }]} {...props} />
}

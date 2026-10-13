import { ScrollView, ScrollViewProps, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useResolveClassNames } from 'uniwind'

type IProps = ScrollViewProps

// Android draws the app edge to edge, under the navigation bar, so a screen's last rows end up behind its buttons
// unless the content is padded by the bar's height, on top of its own bottom padding from a class or a style.
export function ScreenScroll({ contentContainerClassName, contentContainerStyle, ...props }: IProps) {
    const insets = useSafeAreaInsets()
    const resolved = useResolveClassNames(contentContainerClassName ?? '')

    const style = StyleSheet.flatten([resolved, contentContainerStyle]) ?? {}
    const paddingBottom = Number(style.paddingBottom ?? style.paddingVertical ?? style.padding ?? 0) + insets.bottom

    return (
        <ScrollView
            contentContainerClassName={contentContainerClassName}
            contentContainerStyle={[contentContainerStyle, { paddingBottom }]}
            {...props}
        />
    )
}

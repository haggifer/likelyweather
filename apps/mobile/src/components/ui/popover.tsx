import * as PopoverPrimitive from '@rn-primitives/popover'
import * as React from 'react'
import { Platform, StyleSheet, View } from 'react-native'
import { FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { FullWindowOverlay as RNFullWindowOverlay } from 'react-native-screens'
import { useTheme } from '../../hooks/useTheme'
import { cn } from '../../lib/cn'
import { NativeOnlyAnimatedView } from './native-only-animated-view'
import { TextClassContext } from './text'

const Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

const FullWindowOverlay = Platform.OS === 'ios' ? RNFullWindowOverlay : React.Fragment

// The web's popover keeps this far from the window's edges (`collisionPadding`); here it also clears the system bars.
const EDGE_GAP = 8
// Radix's arrow on the web's hint bubble: 10 px wide, 5 px tall, kept clear of the bubble's rounded corners.
const ARROW_WIDTH = 10
const ARROW_HEIGHT = 5
const ARROW_CORNER_GAP = 6

const useEdgeInsets = (insets?: React.ComponentProps<typeof PopoverPrimitive.Content>['insets']) => {
    const safeArea = useSafeAreaInsets()

    return (
        insets ?? {
            top: safeArea.top + EDGE_GAP,
            bottom: safeArea.bottom + EDGE_GAP,
            left: safeArea.left + EDGE_GAP,
            right: safeArea.right + EDGE_GAP,
        }
    )
}

function PopoverContent({
    className,
    align = 'end',
    sideOffset = 4,
    portalHost,
    insets,
    ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content> & {
    portalHost?: string
}) {
    const edgeInsets = useEdgeInsets(insets)

    return (
        <PopoverPrimitive.Portal hostName={portalHost}>
            <FullWindowOverlay>
                <PopoverPrimitive.Overlay
                    style={Platform.select({ native: StyleSheet.absoluteFill })}
                    asChild={Platform.OS !== 'web'}
                >
                    <NativeOnlyAnimatedView
                        entering={FadeIn.duration(200).reduceMotion(ReduceMotion.System)}
                        exiting={FadeOut.reduceMotion(ReduceMotion.System)}
                        as="Pressable"
                    >
                        <TextClassContext.Provider value="text-sm text-popover-foreground">
                            <PopoverPrimitive.Content
                                align={align}
                                sideOffset={sideOffset}
                                insets={edgeInsets}
                                className={cn(
                                    // The web's PopoverPanel.
                                    'bg-popover border-border outline-hidden z-50 w-72 rounded-md border p-3 shadow-md',
                                    Platform.select({
                                        web: cn(
                                            'animate-in fade-in-0 zoom-in-95 origin-(--radix-popover-content-transform-origin) cursor-auto',
                                            props.side === 'bottom' && 'slide-in-from-top-2',
                                            props.side === 'top' && 'slide-in-from-bottom-2',
                                        ),
                                    }),
                                    className,
                                )}
                                {...props}
                            />
                        </TextClassContext.Provider>
                    </NativeOnlyAnimatedView>
                </PopoverPrimitive.Overlay>
            </FullWindowOverlay>
        </PopoverPrimitive.Portal>
    )
}

// Points at the trigger's centre, also where the screen's edge pushed the bubble aside.
const HintArrow = () => {
    const { colors } = useTheme()
    const { triggerPosition, contentLayout } = PopoverPrimitive.useRootContext()

    const center =
        triggerPosition && contentLayout ? triggerPosition.pageX + triggerPosition.width / 2 - contentLayout.x : 0
    const maxLeft = (contentLayout?.width ?? 0) - ARROW_WIDTH - ARROW_CORNER_GAP
    const left = Math.min(Math.max(center - ARROW_WIDTH / 2, ARROW_CORNER_GAP), maxLeft)

    if (!contentLayout) return null

    return (
        <View
            style={{
                position: 'absolute',
                top: -ARROW_HEIGHT,
                left,
                borderLeftWidth: ARROW_WIDTH / 2,
                borderRightWidth: ARROW_WIDTH / 2,
                borderBottomWidth: ARROW_HEIGHT,
                borderLeftColor: 'transparent',
                borderRightColor: 'transparent',
                borderBottomColor: colors.foreground,
            }}
        />
    )
}

// The web's hint bubble (its PopoverContent, which `Hint` opens on a tap): a dark label under the trigger, centred on
// it, with an arrow.
function PopoverHint({
    className,
    sideOffset = 4,
    portalHost,
    insets,
    children,
    ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content> & {
    portalHost?: string
}) {
    const edgeInsets = useEdgeInsets(insets)

    return (
        <PopoverPrimitive.Portal hostName={portalHost}>
            <FullWindowOverlay>
                <PopoverPrimitive.Overlay
                    style={Platform.select({ native: StyleSheet.absoluteFill })}
                    asChild={Platform.OS !== 'web'}
                >
                    <NativeOnlyAnimatedView
                        entering={FadeIn.duration(200).reduceMotion(ReduceMotion.System)}
                        exiting={FadeOut.reduceMotion(ReduceMotion.System)}
                        as="Pressable"
                    >
                        <TextClassContext.Provider value="text-xs text-background">
                            <PopoverPrimitive.Content
                                side="bottom"
                                align="center"
                                sideOffset={sideOffset}
                                insets={edgeInsets}
                                className={cn('bg-foreground z-50 max-w-xs rounded-md px-3 py-1.5', className)}
                                {...props}
                            >
                                <HintArrow />
                                {children}
                            </PopoverPrimitive.Content>
                        </TextClassContext.Provider>
                    </NativeOnlyAnimatedView>
                </PopoverPrimitive.Overlay>
            </FullWindowOverlay>
        </PopoverPrimitive.Portal>
    )
}

export { Popover, PopoverContent, PopoverHint, PopoverTrigger }

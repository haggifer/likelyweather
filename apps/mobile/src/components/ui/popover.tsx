import * as PopoverPrimitive from '@rn-primitives/popover'
import * as React from 'react'
import { Platform, StyleSheet } from 'react-native'
import { FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { FullWindowOverlay as RNFullWindowOverlay } from 'react-native-screens'
import { cn } from '../../lib/cn'
import { NativeOnlyAnimatedView } from './native-only-animated-view'
import { TextClassContext } from './text'

const Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

const FullWindowOverlay = Platform.OS === 'ios' ? RNFullWindowOverlay : React.Fragment

// The web's popover keeps this far from the window's edges (`collisionPadding`); here it also clears the system bars.
const EDGE_GAP = 8

function PopoverContent({
    className,
    align = 'center',
    sideOffset = 4,
    portalHost,
    insets,
    ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content> & {
    portalHost?: string
}) {
    const safeArea = useSafeAreaInsets()

    const edgeInsets = insets ?? {
        top: safeArea.top + EDGE_GAP,
        bottom: safeArea.bottom + EDGE_GAP,
        left: safeArea.left + EDGE_GAP,
        right: safeArea.right + EDGE_GAP,
    }

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
                        <TextClassContext.Provider value="text-popover-foreground">
                            <PopoverPrimitive.Content
                                align={align}
                                sideOffset={sideOffset}
                                insets={edgeInsets}
                                className={cn(
                                    'bg-popover border-border outline-hidden z-50 w-72 rounded-md border p-4 shadow-md shadow-black/5',
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

export { Popover, PopoverContent, PopoverTrigger }

import * as DropdownMenuPrimitive from '@rn-primitives/dropdown-menu'
import * as React from 'react'
import { Platform, type StyleProp, StyleSheet, type ViewStyle } from 'react-native'
import { FadeIn, ReduceMotion } from 'react-native-reanimated'
import { FullWindowOverlay as RNFullWindowOverlay } from 'react-native-screens'
import { cn } from '../../lib/cn'
import { NativeOnlyAnimatedView } from './native-only-animated-view'
import { TextClassContext } from './text'

const DropdownMenu = DropdownMenuPrimitive.Root

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger

const FullWindowOverlay = Platform.OS === 'ios' ? RNFullWindowOverlay : React.Fragment

function DropdownMenuContent({
    className,
    overlayClassName,
    overlayStyle,
    portalHost,
    ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content> & {
    overlayStyle?: StyleProp<ViewStyle>
    overlayClassName?: string
    portalHost?: string
}) {
    return (
        <DropdownMenuPrimitive.Portal hostName={portalHost}>
            <FullWindowOverlay>
                <DropdownMenuPrimitive.Overlay
                    style={Platform.select({
                        web: overlayStyle ?? undefined,
                        native: overlayStyle
                            ? StyleSheet.flatten([
                                  StyleSheet.absoluteFill,
                                  overlayStyle as typeof StyleSheet.absoluteFill,
                              ])
                            : StyleSheet.absoluteFill,
                    })}
                    className={overlayClassName}
                    asChild={Platform.OS !== 'web'}
                >
                    <NativeOnlyAnimatedView entering={FadeIn.reduceMotion(ReduceMotion.System)} as="Pressable">
                        <TextClassContext.Provider value="text-popover-foreground">
                            <DropdownMenuPrimitive.Content
                                className={cn(
                                    'bg-popover border-border min-w-[8rem] overflow-hidden rounded-md border p-1 shadow-lg shadow-black/5',
                                    Platform.select({
                                        web: cn(
                                            'animate-in fade-in-0 zoom-in-95 max-h-(--radix-context-menu-content-available-height) origin-(--radix-context-menu-content-transform-origin) z-50 cursor-default',
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
                </DropdownMenuPrimitive.Overlay>
            </FullWindowOverlay>
        </DropdownMenuPrimitive.Portal>
    )
}

function DropdownMenuItem({
    className,
    inset,
    variant,
    ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
    className?: string
    inset?: boolean
    variant?: 'default' | 'destructive'
}) {
    return (
        <TextClassContext.Provider
            value={cn(
                'select-none text-sm text-popover-foreground group-active:text-popover-foreground',
                variant === 'destructive' && 'text-destructive group-active:text-destructive',
            )}
        >
            <DropdownMenuPrimitive.Item
                className={cn(
                    'active:bg-accent group relative flex flex-row items-center gap-2 rounded-sm px-2 py-2 sm:py-1.5',
                    Platform.select({
                        web: cn(
                            'focus:bg-accent focus:text-accent-foreground cursor-default outline-none data-[disabled]:pointer-events-none',
                            variant === 'destructive' && 'focus:bg-destructive/10 dark:focus:bg-destructive/20',
                        ),
                    }),
                    variant === 'destructive' && 'active:bg-destructive/10 dark:active:bg-destructive/20',
                    props.disabled && 'opacity-50',
                    inset && 'pl-8',
                    className,
                )}
                {...props}
            />
        </TextClassContext.Provider>
    )
}

export { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger }

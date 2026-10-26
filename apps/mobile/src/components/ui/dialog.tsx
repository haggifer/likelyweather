import * as DialogPrimitive from '@rn-primitives/dialog'
import * as React from 'react'
import { Platform, StyleSheet } from 'react-native'
import { FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated'
import { FullWindowOverlay as RNFullWindowOverlay } from 'react-native-screens'
import { cn } from '../../lib/cn'
import { NativeOnlyAnimatedView } from './native-only-animated-view'
import { Text, TextClassContext } from './text'

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogClose = DialogPrimitive.Close

const FullWindowOverlay = Platform.OS === 'ios' ? RNFullWindowOverlay : React.Fragment

// The web's DialogContent: the popover's panel centred over a dimmed screen, 0.5rem from its edges.
function DialogContent({
    className,
    portalHost,
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
    portalHost?: string
}) {
    return (
        <DialogPrimitive.Portal hostName={portalHost}>
            <FullWindowOverlay>
                <DialogPrimitive.Overlay
                    style={Platform.select({ native: StyleSheet.absoluteFill })}
                    asChild={Platform.OS !== 'web'}
                >
                    <NativeOnlyAnimatedView
                        entering={FadeIn.duration(200).reduceMotion(ReduceMotion.System)}
                        exiting={FadeOut.reduceMotion(ReduceMotion.System)}
                        as="Pressable"
                        className="z-50 items-center justify-center bg-black/50 p-2"
                    >
                        <TextClassContext.Provider value="text-sm text-popover-foreground">
                            <DialogPrimitive.Content
                                className={cn(
                                    'bg-popover border-border max-h-full rounded-md border p-3 shadow-md',
                                    className,
                                )}
                                {...props}
                            />
                        </TextClassContext.Provider>
                    </NativeOnlyAnimatedView>
                </DialogPrimitive.Overlay>
            </FullWindowOverlay>
        </DialogPrimitive.Portal>
    )
}

// The kit's Text rather than the primitive's, so the title and description take the app's font as every text does.
function DialogTitle({ className, ...props }: React.ComponentProps<typeof Text>) {
    return <Text role="heading" className={cn('text-base font-semibold', className)} {...props} />
}

function DialogDescription({ className, ...props }: React.ComponentProps<typeof Text>) {
    return <Text className={cn('text-sm text-muted-foreground', className)} {...props} />
}

export { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger }

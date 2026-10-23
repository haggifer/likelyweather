'use client'

import { getColorMode, subscribeColorMode } from '@/lib/color-mode'
import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
    // The app's mode is the .dark class on <html>, not the OS preference
    const theme = useSyncExternalStore(subscribeColorMode, getColorMode, () => 'light' as const)

    return (
        <Sonner
            theme={theme}
            className="toaster group"
            icons={{
                success: <CircleCheckIcon className="size-4" />,
                info: <InfoIcon className="size-4" />,
                warning: <TriangleAlertIcon className="size-4" />,
                error: <OctagonXIcon className="size-4" />,
                loading: <Loader2Icon className="size-4 animate-spin" />,
            }}
            style={
                {
                    '--normal-bg': 'var(--popover)',
                    '--normal-text': 'var(--popover-foreground)',
                    '--normal-border': 'var(--border)',
                    '--border-radius': 'var(--radius)',
                } as React.CSSProperties
            }
            toastOptions={{
                // Sonner sets its buttons' 24 px height on a more specific selector, so the touch size is marked important.
                classNames: {
                    toast: 'cn-toast',
                    actionButton: 'touch:h-9! touch:px-3!',
                    cancelButton: 'touch:h-9! touch:px-3!',
                },
            }}
            {...props}
        />
    )
}

export { Toaster }

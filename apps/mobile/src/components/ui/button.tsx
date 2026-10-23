import { cva, type VariantProps } from 'class-variance-authority'
import { Pressable } from 'react-native'
import { cn } from '../../lib/cn'
import { IconClassContext } from './icon'
import { TextClassContext } from './text'

// The web's variants and sizes (apps/web/src/components/ui/button.tsx). The web gives a touch screen bigger controls
// element by element (`touch:h-9`), so a call site sets the same size here; a press nudges the button down as on the
// web. As the web's `touch:` minimum, no button is under 36 px, and `hitSlop` stretches what a finger can hit to 44.
const buttonVariants = cva(
    'group min-h-9 min-w-9 shrink-0 flex-row items-center justify-center gap-1.5 rounded-lg border border-transparent active:translate-y-px',
    {
        variants: {
            variant: {
                default: 'bg-primary',
                outline: 'border-border bg-background dark:bg-input/30',
                'outline-primary': 'border-primary bg-background dark:bg-input/30',
                secondary: 'bg-secondary',
                ghost: '',
                destructive: 'bg-destructive/10 dark:bg-destructive/20',
                link: '',
            },
            size: {
                default: 'h-8 px-2.5',
                xs: 'h-6 gap-1 rounded-md px-2',
                sm: 'h-7 gap-1 rounded-md px-2.5',
                lg: 'h-9 px-2.5',
                icon: 'size-8',
                'icon-xs': 'size-6 rounded-md',
                'icon-sm': 'size-7 rounded-md',
                'icon-lg': 'size-9',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    },
)

const buttonTextVariants = cva('text-foreground text-sm leading-none font-medium', {
    variants: {
        variant: {
            default: 'text-primary-foreground',
            outline: '',
            'outline-primary': 'text-primary',
            secondary: 'text-secondary-foreground',
            ghost: '',
            destructive: 'text-destructive',
            link: 'text-primary',
        },
        size: {
            default: '',
            xs: 'text-xs',
            sm: 'text-[0.8125rem]',
            lg: '',
            icon: '',
            'icon-xs': '',
            'icon-sm': '',
            'icon-lg': '',
        },
    },
    defaultVariants: {
        variant: 'default',
        size: 'default',
    },
})

const ICON_CLASS: Record<NonNullable<VariantProps<typeof buttonVariants>['size']>, string> = {
    default: 'size-4',
    xs: 'size-3',
    sm: 'size-3.5',
    lg: 'size-4',
    icon: 'size-4',
    'icon-xs': 'size-3',
    'icon-sm': 'size-4',
    'icon-lg': 'size-4',
}

type ButtonProps = React.ComponentProps<typeof Pressable> &
    React.RefAttributes<typeof Pressable> &
    VariantProps<typeof buttonVariants>

function Button({ className, variant, size, ...props }: ButtonProps) {
    return (
        <TextClassContext.Provider value={buttonTextVariants({ variant, size })}>
            <IconClassContext.Provider value={ICON_CLASS[size ?? 'default']}>
                <Pressable
                    className={cn(props.disabled && 'opacity-50', buttonVariants({ variant, size }), className)}
                    role="button"
                    hitSlop={4}
                    {...props}
                />
            </IconClassContext.Provider>
        </TextClassContext.Provider>
    )
}

export { Button }

import { cva, type VariantProps } from 'class-variance-authority'
import { Pressable } from 'react-native'
import { cn } from '../../lib/cn'
import { TextClassContext } from './text'

// The web's variants (apps/web/src/components/ui/button.tsx) at its coarse-pointer sizes: a finger needs the 36 px the
// web gives touch screens.
const buttonVariants = cva(
    'group shrink-0 flex-row items-center justify-center gap-1.5 rounded-lg border border-transparent',
    {
        variants: {
            variant: {
                default: 'bg-primary active:bg-primary/80',
                outline:
                    'border-border bg-background active:bg-muted dark:border-border dark:bg-input/30 dark:active:bg-input/50',
                secondary: 'bg-secondary active:bg-secondary/80',
                ghost: 'active:bg-muted dark:active:bg-muted/50',
                destructive:
                    'bg-destructive/10 active:bg-destructive/20 dark:bg-destructive/20 dark:active:bg-destructive/30',
                link: '',
            },
            size: {
                default: 'h-9 px-3',
                xs: 'h-7 gap-1 rounded-md px-2',
                sm: 'h-8 gap-1 rounded-md px-2.5',
                lg: 'h-10 px-3',
                icon: 'size-9',
                'icon-xs': 'size-7 rounded-md',
                'icon-sm': 'size-8 rounded-md',
                'icon-lg': 'size-10',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    },
)

const buttonTextVariants = cva('text-foreground text-sm font-medium', {
    variants: {
        variant: {
            default: 'text-primary-foreground',
            outline: 'group-active:text-foreground',
            secondary: 'text-secondary-foreground',
            ghost: 'group-active:text-foreground',
            destructive: 'text-destructive',
            link: 'text-primary group-active:underline',
        },
        size: {
            default: '',
            xs: 'text-xs',
            sm: 'text-[0.8rem]',
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

type ButtonProps = React.ComponentProps<typeof Pressable> &
    React.RefAttributes<typeof Pressable> &
    VariantProps<typeof buttonVariants>

function Button({ className, variant, size, ...props }: ButtonProps) {
    return (
        <TextClassContext.Provider value={buttonTextVariants({ variant, size })}>
            <Pressable
                className={cn(props.disabled && 'opacity-50', buttonVariants({ variant, size }), className)}
                role="button"
                {...props}
            />
        </TextClassContext.Provider>
    )
}

export { Button, buttonTextVariants, buttonVariants }
export type { ButtonProps }

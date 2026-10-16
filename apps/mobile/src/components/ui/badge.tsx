import { Slot } from '@rn-primitives/slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Platform, View } from 'react-native'
import { cn } from '../../lib/cn'
import { IconClassContext } from './icon'
import { TextClassContext } from './text'

const badgeVariants = cva(
    cn(
        // The web's 20 px pill, as wide as its content (`w-fit`) unless a call site stretches it. No vertical padding:
        // the height and the centring place the text, whose Android line box is taller than the web's.
        'border-border group h-5 shrink-0 flex-row items-center justify-center gap-1 self-start overflow-hidden rounded-full border px-2',
        Platform.select({
            web: 'focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive w-fit whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] [&>svg]:pointer-events-none [&>svg]:size-3',
        }),
    ),
    {
        variants: {
            variant: {
                default: cn('bg-primary border-transparent', Platform.select({ web: '[a&]:hover:bg-primary/90' })),
                secondary: cn(
                    'bg-secondary border-transparent',
                    Platform.select({ web: '[a&]:hover:bg-secondary/90' }),
                ),
                destructive: cn(
                    'bg-destructive/10 dark:bg-destructive/20 border-transparent',
                    Platform.select({ web: '[a&]:hover:bg-destructive/90' }),
                ),
                outline: Platform.select({ web: '[a&]:hover:bg-accent [a&]:hover:text-accent-foreground' }),
                // The web's status badges: a tinted pill with the tone's text colour (`--*-text`, globals.css).
                ok: 'bg-success/15 border-transparent',
                info: 'bg-info/15 border-transparent',
                warn: 'bg-warning/15 border-transparent',
                fail: 'bg-destructive/15 border-transparent',
                muted: 'bg-muted-foreground/15 border-transparent',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    },
)

const badgeTextVariants = cva('text-xs leading-4 font-medium', {
    variants: {
        variant: {
            default: 'text-primary-foreground',
            secondary: 'text-secondary-foreground',
            destructive: 'text-destructive',
            outline: 'text-foreground',
            ok: 'text-success-text font-semibold',
            info: 'text-info-text font-semibold',
            warn: 'text-warning-text font-semibold',
            fail: 'text-destructive-text font-semibold',
            muted: 'text-muted-foreground font-semibold',
        },
    },
    defaultVariants: {
        variant: 'default',
    },
})

type BadgeProps = React.ComponentProps<typeof View> &
    React.RefAttributes<View> & {
        asChild?: boolean
    } & VariantProps<typeof badgeVariants>

function Badge({ className, variant, asChild, ...props }: BadgeProps) {
    const Component = asChild ? Slot : View
    return (
        <TextClassContext.Provider value={badgeTextVariants({ variant })}>
            <IconClassContext.Provider value="size-3">
                <Component className={cn(badgeVariants({ variant }), className)} {...props} />
            </IconClassContext.Provider>
        </TextClassContext.Provider>
    )
}

export { Badge }

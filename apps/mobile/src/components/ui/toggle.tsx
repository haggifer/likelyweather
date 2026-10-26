import { cva, type VariantProps } from 'class-variance-authority'
import { Platform } from 'react-native'
import { cn } from '../../lib/cn'

// The web's sizes and look (apps/web/src/components/ui/toggle.tsx): `bg-muted` when on, which call sites override as
// the web's do (the variable switch's `bg-accent`). As the web's `touch:h-9`, no toggle is under 36 px tall.
const toggleVariants = cva(
    cn(
        'active:bg-muted group flex min-h-9 flex-row items-center justify-center gap-1 rounded-lg',
        Platform.select({
            web: 'hover:bg-muted hover:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive inline-flex cursor-default whitespace-nowrap outline-none transition-[color,box-shadow] focus-visible:ring-[3px] disabled:pointer-events-none [&_svg]:pointer-events-none',
        }),
    ),
    {
        variants: {
            variant: {
                default: 'bg-transparent',
                outline: cn(
                    'border-border border bg-transparent',
                    Platform.select({
                        web: 'hover:bg-accent hover:text-accent-foreground',
                    }),
                ),
            },
            size: {
                default: 'h-8 min-w-8 px-2.5',
                sm: 'h-7 min-w-7 rounded-md px-2.5',
                lg: 'h-9 min-w-9 px-2.5',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    },
)

const toggleTextVariants = cva('text-sm text-foreground font-medium', {
    variants: {
        size: { default: '', sm: 'text-[0.8125rem]', lg: '' },
    },
    defaultVariants: { size: 'default' },
})

const getToggleIconClass = (size: VariantProps<typeof toggleVariants>['size']) =>
    size === 'sm' ? 'size-3.5' : 'size-4'

export { getToggleIconClass, toggleTextVariants, toggleVariants }

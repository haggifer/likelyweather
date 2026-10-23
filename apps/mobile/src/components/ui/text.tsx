import { Slot } from '@rn-primitives/slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { Platform, Text as RNText, StyleSheet, type Role, type TextStyle } from 'react-native'
import { useResolveClassNames } from 'uniwind'
import { cn } from '../../lib/cn'
import { getFontFamily } from '../../theme/fonts'

const textVariants = cva(
    cn(
        'text-foreground text-base',
        Platform.select({
            web: 'select-text',
        }),
    ),
    {
        variants: {
            variant: {
                default: '',
                h1: cn(
                    'text-center text-4xl font-extrabold tracking-tight',
                    Platform.select({ web: 'scroll-m-20 text-balance' }),
                ),
                h2: cn(
                    'border-border border-b pb-2 text-3xl font-semibold tracking-tight',
                    Platform.select({ web: 'scroll-m-20 first:mt-0' }),
                ),
                h3: cn('text-2xl font-semibold tracking-tight', Platform.select({ web: 'scroll-m-20' })),
                h4: cn('text-xl font-semibold tracking-tight', Platform.select({ web: 'scroll-m-20' })),
                p: 'mt-3 leading-7 sm:mt-6',
                blockquote: 'mt-4 border-l-2 pl-3 italic sm:mt-6 sm:pl-6',
                code: cn('bg-muted relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold'),
                lead: 'text-muted-foreground text-xl',
                large: 'text-lg font-semibold',
                small: 'text-sm font-medium leading-none',
                muted: 'text-muted-foreground text-sm',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    },
)

type TextVariantProps = VariantProps<typeof textVariants>

type TextVariant = NonNullable<TextVariantProps['variant']>

const ROLE: Partial<Record<TextVariant, Role>> = {
    h1: 'heading',
    h2: 'heading',
    h3: 'heading',
    h4: 'heading',
    blockquote: Platform.select({ web: 'blockquote' as Role }),
    code: Platform.select({ web: 'code' as Role }),
}

const ARIA_LEVEL: Partial<Record<TextVariant, string>> = {
    h1: '1',
    h2: '2',
    h3: '3',
    h4: '4',
}

// Tabular figures in every text, as the web's body sets them, so a figure takes the same width in both apps. Set as a
// style: Uniwind 1.12 turns the `tabular-nums` class into `['', 'tabular-nums']`, and Android logs an error for the
// empty value of every text that has it.
const TABULAR_FIGURES: TextStyle['fontVariant'] = ['tabular-nums']

const TextClassContext = React.createContext<string | undefined>(undefined)

// tailwind-merge drops a line height that a later font size follows, so a call site's `text-sm` would undo the line
// height a kit part sets (a button's 1, a badge's 16 px); it comes back unless the call site sets its own.
const getContextLeading = (textClass?: string, className?: string) =>
    /(^|\s)leading-/.test(className ?? '') ? undefined : textClass?.match(/(?:^|\s)(leading-\S+)/)?.[1]

function Text({
    className,
    asChild = false,
    variant = 'default',
    ...props
}: React.ComponentProps<typeof RNText> &
    React.RefAttributes<typeof RNText> &
    TextVariantProps & {
        asChild?: boolean
    }) {
    const textClass = React.useContext(TextClassContext)
    const Component = asChild ? Slot : RNText
    const classes = cn(textVariants({ variant }), textClass, className, getContextLeading(textClass, className))
    // The app's Inter: Android picks a loaded font by family name, so the weight from the classes and the style names
    // the family, and `fontWeight` is reset so Android does not embolden a bold file a second time. A family the
    // style names itself (the logo's Lexend) stays.
    const resolved = useResolveClassNames(classes)
    const fontFamily =
        StyleSheet.flatten(props.style)?.fontFamily ??
        getFontFamily(StyleSheet.flatten([resolved, props.style])?.fontWeight)
    return (
        <Component
            className={classes}
            role={variant ? ROLE[variant] : undefined}
            aria-level={variant ? ARIA_LEVEL[variant] : undefined}
            {...props}
            style={[props.style, { fontFamily, fontWeight: 'normal', fontVariant: TABULAR_FIGURES }]}
        />
    )
}

export { Text, TextClassContext }

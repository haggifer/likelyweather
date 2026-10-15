import * as ToggleGroupPrimitive from '@rn-primitives/toggle-group'
import type { VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { Platform } from 'react-native'
import { cn } from '../../lib/cn'
import { Icon, IconClassContext } from './icon'
import { TextClassContext } from './text'
import { getToggleIconClass, toggleTextVariants, toggleVariants } from './toggle'

const ToggleGroupContext = React.createContext<VariantProps<typeof toggleVariants> | null>(null)

function ToggleGroup({
    className,
    variant,
    size,
    children,
    ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> & VariantProps<typeof toggleVariants>) {
    return (
        <ToggleGroupPrimitive.Root
            // The web's joined group (`spacing={0}`, which every call site there uses).
            className={cn('flex flex-row items-center rounded-lg', Platform.select({ web: 'w-fit' }), className)}
            {...props}
        >
            <ToggleGroupContext.Provider value={{ variant, size }}>{children}</ToggleGroupContext.Provider>
        </ToggleGroupPrimitive.Root>
    )
}

function useToggleGroupContext() {
    const context = React.useContext(ToggleGroupContext)
    if (context === null) {
        throw new Error('ToggleGroup compound components cannot be rendered outside the ToggleGroup component')
    }
    return context
}

function ToggleGroupItem({
    className,
    children,
    variant,
    size,
    isFirst,
    isLast,
    ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item> &
    VariantProps<typeof toggleVariants> & {
        isFirst?: boolean
        isLast?: boolean
    }) {
    const context = useToggleGroupContext()
    const { value } = ToggleGroupPrimitive.useRootContext()

    const itemSize = context.size || size
    const isSelected = ToggleGroupPrimitive.utils.getIsSelected(value, props.value)

    return (
        <TextClassContext.Provider
            value={cn(
                toggleTextVariants({ size: itemSize }),
                !isSelected && Platform.select({ web: 'group-hover:text-muted-foreground' }),
            )}
        >
            <IconClassContext.Provider value={getToggleIconClass(itemSize)}>
                <ToggleGroupPrimitive.Item
                    className={cn(
                        toggleVariants({
                            variant: context.variant || variant,
                            size: itemSize,
                        }),
                        props.disabled && 'opacity-50',
                        isSelected && 'bg-muted',
                        'min-w-0 shrink-0 rounded-none px-2',
                        isFirst && 'rounded-l-lg',
                        isLast && 'rounded-r-lg',
                        (context.variant === 'outline' || variant === 'outline') && 'border-l-0',
                        (context.variant === 'outline' || variant === 'outline') && isFirst && 'border-l',
                        Platform.select({
                            web: 'flex-1 focus:z-10 focus-visible:z-10',
                        }),
                        className,
                    )}
                    {...props}
                >
                    {children}
                </ToggleGroupPrimitive.Item>
            </IconClassContext.Provider>
        </TextClassContext.Provider>
    )
}

function ToggleGroupIcon({ className, ...props }: React.ComponentProps<typeof Icon>) {
    return <Icon className={cn('shrink-0', className)} {...props} />
}

export { ToggleGroup, ToggleGroupIcon, ToggleGroupItem }

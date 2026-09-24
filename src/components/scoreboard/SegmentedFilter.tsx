'use client'

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

interface IProps<T extends string | number> {
    label: string
    value: T
    options: readonly { value: T; label: string }[]
    onChange: (value: T) => void
}

export default function SegmentedFilter<T extends string | number>({ label, value, options, onChange }: IProps<T>) {
    return (
        <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
            <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                spacing={0}
                value={String(value)}
                aria-label={label}
                onValueChange={(v) => {
                    const next = options.find((o) => String(o.value) === v)

                    if (next) onChange(next.value)
                }}
            >
                {options.map((o) => (
                    <ToggleGroupItem key={String(o.value)} value={String(o.value)} className="px-2.5 text-xs">
                        {o.label}
                    </ToggleGroupItem>
                ))}
            </ToggleGroup>
        </div>
    )
}

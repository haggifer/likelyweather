'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'
import { MODELS } from '@/shared/models'
import { useAppDispatch, useAppSelector } from '@/store'
import { setThemeLabOpen } from '@/store/layoutSlice'
import {
    ACCENTS,
    BAND_STYLES,
    DENSITIES,
    FONT_STACKS,
    HEADING_OPTIONS,
    HEATMAP_SCALES,
    LEGEND_PLACEMENTS,
    MONO_OPTIONS,
    RADII,
    SANS_OPTIONS,
    SURFACES,
    TEXT_SIZES,
} from '@/theme/axes'
import { CHART_MIN, getContrastRatio, TEXT_AA } from '@/theme/contrast'
import { PRESET_ORDER, PRESETS } from '@/theme/presets'
import { useThemeLab } from '@/theme/ThemeLabProvider'
import { FontName, PRESET_SENTINEL, SANS_SENTINEL, ThemeState } from '@/theme/tokens'
import { FlaskConical, Star, X } from 'lucide-react'
import { ReactNode, useState } from 'react'

interface SectionProps {
    label: string
    hint?: string
    children: ReactNode
}

interface SegmentProps<T extends string | number> {
    value: T
    options: readonly T[]
    onChange: (value: T) => void
    format?: (value: T) => string
}

interface FontSelectProps {
    value: string
    options: FontName[]
    allowSans?: boolean
    onChange: (value: string) => void
}

const Section = ({ label, hint, children }: SectionProps) => (
    <div className="border-b px-4 py-3 last:border-0">
        <div className="mb-2 flex items-baseline justify-between">
            <span className="text-[11px] font-semibold tracking-wider uppercase">{label}</span>
            {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
        </div>
        {children}
    </div>
)

const Segment = <T extends string | number>({ value, options, onChange, format = String }: SegmentProps<T>) => (
    <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={String(value)}
        onValueChange={(v) => {
            const next = options.find((o) => String(o) === v)

            if (next !== undefined) onChange(next)
        }}
        className="flex-wrap"
    >
        {options.map((o) => (
            <ToggleGroupItem key={String(o)} value={String(o)} className="px-2.5 text-xs">
                {format(o)}
            </ToggleGroupItem>
        ))}
    </ToggleGroup>
)

const getFontLabel = (value: string) =>
    value === PRESET_SENTINEL ? 'Preset default' : value === SANS_SENTINEL ? 'Same as sans' : value

const FontSelect = ({ value, options, allowSans, onChange }: FontSelectProps) => (
    <Select value={value} onValueChange={onChange}>
        <SelectTrigger size="sm" className="w-full">
            <SelectValue />
        </SelectTrigger>
        <SelectContent>
            {[PRESET_SENTINEL, ...(allowSans ? [SANS_SENTINEL] : []), ...options].map((o) => (
                <SelectItem key={o} value={o}>
                    {getFontLabel(o)}
                </SelectItem>
            ))}
        </SelectContent>
    </Select>
)

const ContrastBadge = ({ ratio, min }: { ratio: number; min: number }) => (
    <span
        className={cn(
            'rounded px-1.5 text-[10px] font-bold',
            ratio >= min ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive',
        )}
    >
        {ratio >= min ? (min === TEXT_AA ? 'AA' : 'OK') : 'FAIL'}
    </span>
)

export default function ThemeLabPanel() {
    const dispatch = useAppDispatch()
    const isOpen = useAppSelector((s) => s.layout.themeLabOpen)
    const lab = useThemeLab()
    const [favoriteName, setFavoriteName] = useState('')
    const { state, resolved, setField } = lab
    const side = resolved.side
    const setter =
        <K extends keyof ThemeState>(key: K) =>
        (value: ThemeState[K]) =>
            setField(key, value)

    const textRows = [
        { label: 'Text on background', fg: side.foreground, bg: side.background },
        { label: 'Primary fg on primary', fg: side.primaryForeground, bg: side.primary },
        { label: 'Muted text on card', fg: side.mutedForeground, bg: side.card },
    ]
    const chartSwatches = [
        ...MODELS.map((m) => ({ key: m.id, label: m.name, color: m.color })),
        { key: 'median', label: 'Median', color: side.median },
        { key: 'band', label: 'Band', color: side.band },
    ]

    const handleSaveFavorite = () => {
        lab.addFavorite(favoriteName.trim())
        setFavoriteName('')
    }

    return (
        <>
            <Button
                onClick={() => dispatch(setThemeLabOpen(!isOpen))}
                className="fixed right-4 bottom-4 z-40 rounded-full shadow-lg"
                aria-label="Toggle Theme Lab (Ctrl+Shift+T)"
            >
                <FlaskConical /> Lab
            </Button>
            <Sheet modal={false} open={isOpen} onOpenChange={(open) => dispatch(setThemeLabOpen(open))}>
                <SheetContent
                    side="right"
                    className="w-[360px] gap-0 p-0 sm:max-w-[360px]"
                    onInteractOutside={(e) => e.preventDefault()}
                >
                    <SheetHeader className="gap-2 border-b">
                        <SheetTitle className="flex items-center gap-2">
                            <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                                DEV
                            </span>
                            Theme Lab
                        </SheetTitle>
                        <SheetDescription className="text-xs">
                            Compare complete designs on the real screens, then freeze one with Copy CSS.
                        </SheetDescription>
                        <div className="flex flex-wrap gap-1.5">
                            <Button size="sm" onClick={lab.copyCss}>
                                Copy CSS
                            </Button>
                            <Button size="sm" variant="outline" onClick={lab.copyLink}>
                                Copy link
                            </Button>
                            <Button size="sm" variant="outline" onClick={lab.abFlip} title="Ctrl+Shift+A">
                                A / B
                            </Button>
                            <Button size="sm" variant="outline" onClick={lab.reset}>
                                Reset
                            </Button>
                        </div>
                    </SheetHeader>
                    <ScrollArea className="min-h-0 flex-1">
                        {lab.favorites.length > 0 && (
                            <Section label="Favorites">
                                <div className="flex flex-col gap-1">
                                    {lab.favorites.map((f, i) => (
                                        <div key={`${f.name}-${i}`} className="flex items-center gap-2">
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                className="flex-1 justify-start"
                                                onClick={() => lab.applyFavorite(i)}
                                            >
                                                <Star className="text-warning" /> {f.name}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() => lab.removeFavorite(i)}
                                                aria-label={`Remove ${f.name}`}
                                            >
                                                <X />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </Section>
                        )}
                        <Section label="Preset">
                            <div className="grid grid-cols-2 gap-2">
                                {PRESET_ORDER.map((id) => {
                                    const preset = PRESETS[id]
                                    const colors = preset[preset.defaultMode]

                                    return (
                                        <button
                                            key={id}
                                            type="button"
                                            onClick={() => lab.selectPreset(id)}
                                            className={cn(
                                                'overflow-hidden rounded-md border text-left',
                                                state.preset === id && 'ring-2 ring-primary',
                                            )}
                                        >
                                            <div
                                                className="flex h-9 items-center gap-1.5 px-2"
                                                style={{ background: colors.background }}
                                            >
                                                <span
                                                    className="size-3.5 rounded-sm"
                                                    style={{ background: colors.primary }}
                                                />
                                                <span
                                                    className="text-[11px] font-semibold"
                                                    style={{
                                                        color: colors.foreground,
                                                        fontFamily: FONT_STACKS[preset.meta.heading],
                                                    }}
                                                >
                                                    14.2 °C
                                                </span>
                                            </div>
                                            <div className="px-2 py-1">
                                                <div className="text-[11px] font-semibold">{preset.name}</div>
                                                <div className="text-[10px] leading-tight text-muted-foreground">
                                                    {preset.tag}
                                                </div>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </Section>
                        <Section label="Mode" hint={resolved.mode}>
                            <Segment
                                value={state.mode}
                                options={['light', 'dark', 'system'] as const}
                                onChange={setter('mode')}
                            />
                        </Section>
                        <Section label="Primary accent">
                            <div className="flex flex-wrap items-center gap-1.5">
                                <Button
                                    size="sm"
                                    variant={state.accent === PRESET_SENTINEL ? 'default' : 'outline'}
                                    onClick={() => setField('accent', PRESET_SENTINEL)}
                                >
                                    Preset
                                </Button>
                                {ACCENTS.map((a) => (
                                    <button
                                        key={a.key}
                                        type="button"
                                        title={a.label}
                                        aria-label={`${a.label} accent`}
                                        onClick={() => setField('accent', a.key)}
                                        className={cn(
                                            'size-7 rounded-md border-2',
                                            state.accent === a.key ? 'border-foreground' : 'border-transparent',
                                        )}
                                        style={{ background: a.key }}
                                    />
                                ))}
                            </div>
                        </Section>
                        <Section label="Fonts">
                            <div className="grid grid-cols-[4rem_1fr] items-center gap-2 text-xs">
                                <span className="text-muted-foreground">Sans</span>
                                <FontSelect value={state.sans} options={SANS_OPTIONS} onChange={setter('sans')} />
                                <span className="text-muted-foreground">Heading</span>
                                <FontSelect
                                    value={state.heading}
                                    options={HEADING_OPTIONS}
                                    allowSans
                                    onChange={setter('heading')}
                                />
                                <span className="text-muted-foreground">Mono</span>
                                <FontSelect value={state.mono} options={MONO_OPTIONS} onChange={setter('mono')} />
                            </div>
                        </Section>
                        <Section label="Base text size" hint={`${state.textBase}px`}>
                            <Segment value={state.textBase} options={TEXT_SIZES} onChange={setter('textBase')} />
                        </Section>
                        <Section label="Radius" hint={`${state.radius}px`}>
                            <Segment value={state.radius} options={RADII} onChange={setter('radius')} />
                        </Section>
                        <Section label="Density">
                            <Segment value={state.density} options={DENSITIES} onChange={setter('density')} />
                        </Section>
                        <Section label="Surface">
                            <Segment value={state.surface} options={SURFACES} onChange={setter('surface')} />
                        </Section>
                        <Section label="Chart bands">
                            <Segment
                                value={state.bands}
                                options={BAND_STYLES}
                                onChange={setter('bands')}
                                format={(v) => ({ 'minmax-iqr': 'min–max + IQR', iqr: 'IQR only', none: 'none' })[v]}
                            />
                        </Section>
                        <Section label="Heatmap scale">
                            <Segment value={state.heatmap} options={HEATMAP_SCALES} onChange={setter('heatmap')} />
                        </Section>
                        <Section label="Status chips">
                            <Segment
                                value={state.chips}
                                options={['filled', 'outline', 'dot'] as const}
                                onChange={setter('chips')}
                                format={(v) => (v === 'dot' ? 'dot + text' : v)}
                            />
                        </Section>
                        <Section label="Legend placement">
                            <Segment
                                value={state.legend}
                                options={LEGEND_PLACEMENTS}
                                onChange={setter('legend')}
                                format={(v) => (v === 'side' ? 'side list' : 'under chart')}
                            />
                        </Section>
                        <Section label="Contrast (WCAG)" hint="text ≥ 4.5 · chart ≥ 3 on card">
                            <div className="flex flex-col gap-1.5 text-[11px]">
                                {textRows.map((row) => {
                                    const ratio = getContrastRatio(row.fg, row.bg)

                                    return (
                                        <div key={row.label} className="flex items-center gap-2">
                                            <span className="flex-1 text-muted-foreground">{row.label}</span>
                                            <span className="font-mono tabular-nums">{ratio.toFixed(1)}:1</span>
                                            <ContrastBadge ratio={ratio} min={TEXT_AA} />
                                        </div>
                                    )
                                })}
                                <div className="mt-1 grid grid-cols-6 gap-1">
                                    {chartSwatches.map((s) => {
                                        const ratio = getContrastRatio(s.color, side.card)

                                        return (
                                            <div
                                                key={s.key}
                                                title={`${s.label}: ${ratio.toFixed(2)}:1`}
                                                className={cn(
                                                    'flex flex-col items-center gap-0.5 font-mono text-[9px] tabular-nums',
                                                    ratio < CHART_MIN ? 'text-destructive' : 'text-muted-foreground',
                                                )}
                                            >
                                                <span
                                                    className="h-3.5 w-6 rounded-sm"
                                                    style={{ background: s.color }}
                                                />
                                                {ratio.toFixed(1)}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </Section>
                        <Section label="Save favorite">
                            <div className="flex gap-1.5">
                                <Input
                                    value={favoriteName}
                                    onChange={(e) => setFavoriteName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveFavorite()}
                                    placeholder="Name this combination"
                                    className="h-8 text-xs"
                                />
                                <Button size="sm" variant="outline" onClick={handleSaveFavorite}>
                                    <Star /> Save
                                </Button>
                            </div>
                        </Section>
                    </ScrollArea>
                </SheetContent>
            </Sheet>
        </>
    )
}

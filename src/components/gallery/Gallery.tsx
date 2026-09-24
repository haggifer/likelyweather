'use client'

import ChartFrame from '@/charts/ChartFrame'
import EvolutionChart from '@/charts/EvolutionChart'
import PrecipPanel from '@/charts/PrecipPanel'
import SpaghettiChart from '@/charts/SpaghettiChart'
import DisagreementTiles from '@/components/city/DisagreementTiles'
import ModelLegend from '@/components/city/ModelLegend'
import OverviewCard from '@/components/city/OverviewCard'
import StatusChip from '@/components/shell/StatusChip'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { LAB_DUMP, LAB_NOW } from '@/fixtures/labDump'
import { computeChanceOfRain, computeDisagreement, computeEnsemble } from '@/shared/ensemble'
import { MODELS } from '@/shared/models'
import { getSlotStart } from '@/shared/slots'
import { addHours } from '@/shared/time'
import { Variable } from '@/shared/variables'
import { THEME_CHANGE_EVENT } from '@/theme/apply'
import { getContrastRatio } from '@/theme/contrast'
import { Loader2 } from 'lucide-react'
import { useLocale } from 'next-intl'
import { useMemo, useState, useSyncExternalStore } from 'react'

interface SectionProps {
    title: string
    children: React.ReactNode
}

const CITY = LAB_DUMP.city
const TEMP = LAB_DUMP.latest[Variable.Temp]
const PRECIP = LAB_DUMP.latest[Variable.Precip]
const OVERVIEW_ANCHOR = getSlotStart(LAB_NOW, CITY.timezone)

const SWATCH_TOKENS = [
    ['--background', '--foreground'],
    ['--card', '--card-foreground'],
    ['--primary', '--primary-foreground'],
    ['--secondary', '--secondary-foreground'],
    ['--muted', '--muted-foreground'],
    ['--accent', '--accent-foreground'],
    ['--destructive', '--background'],
    ['--success', '--background'],
    ['--warning', '--background'],
    ['--info', '--background'],
] as const

const subscribe = (onChange: () => void) => {
    window.addEventListener(THEME_CHANGE_EVENT, onChange)
    return () => window.removeEventListener(THEME_CHANGE_EVENT, onChange)
}

const readTokens = () => {
    const style = getComputedStyle(document.documentElement)
    return SWATCH_TOKENS.map(
        ([bg, fg]) => `${style.getPropertyValue(bg).trim()}|${style.getPropertyValue(fg).trim()}`,
    ).join(',')
}

const Section = ({ title, children }: SectionProps) => (
    <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {children}
    </section>
)

export default function Gallery() {
    const locale = useLocale()
    const [hover, setHover] = useState<number | null>(null)
    const tokenSnapshot = useSyncExternalStore(subscribe, readTokens, () => '')
    const stats = useMemo(
        () =>
            computeEnsemble(
                TEMP.series.map((s) => s.values),
                TEMP.steps.length,
            ),
        [],
    )
    const disagreement = useMemo(
        () =>
            computeDisagreement(
                TEMP.steps,
                TEMP.series.map((s) => s.values),
                Variable.Temp,
                CITY.timezone,
                LAB_NOW,
            ),
        [],
    )
    const precip = useMemo(() => {
        const first = PRECIP.steps.findIndex((s) => new Date(s) > LAB_NOW)
        const series = PRECIP.series.map((s) => ({ ...s, values: s.values.slice(first) }))
        const steps = PRECIP.steps.slice(first)
        const values = series.map((s) => s.values)
        return {
            steps,
            series,
            median: computeEnsemble(values, steps.length).median,
            chance: computeChanceOfRain(values, steps.length),
        }
    }, [])
    const swatches = tokenSnapshot
        ? tokenSnapshot.split(',').map((pair, i) => {
              const [bg, fg] = pair.split('|')
              return {
                  name: SWATCH_TOKENS[i][0],
                  bg,
                  fg,
                  ratio: bg.startsWith('#') && fg.startsWith('#') ? getContrastRatio(bg, fg) : null,
              }
          })
        : []
    const chart = (height = 300) => (
        <SpaghettiChart
            steps={TEMP.steps}
            series={TEMP.series}
            stats={stats}
            variable={Variable.Temp}
            timeZone={CITY.timezone}
            locale={locale}
            ariaLabel="Gallery spaghetti chart"
            hoverIndex={hover}
            onHoverIndex={setHover}
            height={height}
            now={LAB_NOW}
        />
    )

    return (
        <div className="flex flex-col gap-10">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Theme Lab gallery</h1>
                <p className="text-muted-foreground">
                    Every key component on a static dump of real API payloads ({CITY.name}, captured{' '}
                    {LAB_NOW.toISOString().slice(0, 16).replace('T', ' ')} UTC with pnpm lab:dump). Nothing here fetches
                    data. Open the Lab (Ctrl/Cmd+Shift+T) and change any axis; this page and the real screens re-render
                    instantly.
                </p>
            </div>
            <Section title="Typography">
                <Card>
                    <CardContent className="flex flex-col gap-2">
                        <p className="text-4xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
                            Ten forecasts. One city.
                        </p>
                        <p className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
                            Where do the models disagree? Харків, 24 вересня
                        </p>
                        <p>Body: the median line is the middle of all models at each 6-hour step.</p>
                        <p className="text-sm text-muted-foreground">Muted: issue 12:00 UTC · 15:00 local</p>
                        <p className="font-mono text-sm">Mono 0123456789 · spread 1.24 °C · 1012 hPa</p>
                    </CardContent>
                </Card>
            </Section>
            <Section title="Swatches and contrast">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {swatches.map((s) => (
                        <div key={s.name} className="overflow-hidden rounded-md border">
                            <div
                                className="flex h-14 items-center justify-center text-sm font-semibold"
                                style={{ background: s.bg, color: s.fg }}
                            >
                                Aa 12.4
                            </div>
                            <div className="px-2 py-1 text-[11px]">
                                <div className="font-mono">{s.name}</div>
                                <div className="text-muted-foreground">{s.ratio ? `${s.ratio.toFixed(2)}:1` : '–'}</div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex flex-wrap gap-2">
                    {MODELS.map((m) => (
                        <span key={m.id} className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs">
                            <span className="size-3 rounded-sm" style={{ background: m.color }} />
                            {m.name}
                        </span>
                    ))}
                </div>
            </Section>
            <Section title="Buttons, inputs, chips">
                <Card>
                    <CardContent className="flex flex-col gap-4">
                        <div className="flex flex-wrap gap-2">
                            <Button>Primary</Button>
                            <Button variant="secondary">Secondary</Button>
                            <Button variant="outline">Outline</Button>
                            <Button variant="ghost">Ghost</Button>
                            <Button variant="destructive">Destructive</Button>
                            <Button variant="link">Link</Button>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <Input placeholder="Search any city…" className="w-60" />
                            <Select defaultValue="temp">
                                <SelectTrigger className="w-36">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="temp">Temperature</SelectItem>
                                    <SelectItem value="wind">Wind speed</SelectItem>
                                    <SelectItem value="pressure">Pressure</SelectItem>
                                </SelectContent>
                            </Select>
                            <Switch defaultChecked aria-label="Example switch" />
                            <ToggleGroup type="single" variant="outline" size="sm" spacing={0} defaultValue="side">
                                <ToggleGroupItem value="side">Side list</ToggleGroupItem>
                                <ToggleGroupItem value="under">Under chart</ToggleGroupItem>
                            </ToggleGroup>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <StatusChip tone="ok">Agree</StatusChip>
                            <StatusChip tone="warn">Mixed</StatusChip>
                            <StatusChip tone="fail">Split</StatusChip>
                            <StatusChip tone="info">Preview</StatusChip>
                            <StatusChip tone="muted">Dormant</StatusChip>
                            <Badge>Badge</Badge>
                            <Badge variant="secondary">Secondary</Badge>
                            <Badge variant="outline">Outline</Badge>
                        </div>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="self-start">
                                    Open dialog
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Track Nairobi?</DialogTitle>
                                    <DialogDescription>
                                        Nairobi joins the 6-hourly collection. Its forecast appears within seconds.
                                    </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                    <Button variant="outline">Cancel</Button>
                                    <Button>Track</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </CardContent>
                </Card>
            </Section>
            <Section title="Landing overview: median of every variable, fresh and 4 hours later">
                <OverviewCard city={CITY} hourly={LAB_DUMP.hourly} anchor={OVERVIEW_ANCHOR} now={LAB_NOW} />
                <OverviewCard
                    city={CITY}
                    hourly={LAB_DUMP.hourly}
                    anchor={OVERVIEW_ANCHOR}
                    now={addHours(LAB_NOW, 4)}
                    onRefresh={() => {}}
                />
            </Section>
            <Section title="Spaghetti chart: live, loading, preview-only">
                <div className="grid gap-(--card-gap) lg:grid-cols-[minmax(0,1fr)_320px]">
                    <ChartFrame
                        title={`Temperature · ${TEMP.series.length} models`}
                        description={`Issue ${TEMP.issueTime}`}
                    >
                        {chart()}
                    </ChartFrame>
                    <div className="rounded-(--radius) border bg-card p-3">
                        <ModelLegend
                            series={TEMP.series}
                            median={stats.median[hover ?? 4]}
                            readoutIndex={hover ?? 4}
                            readoutLabel="Readout"
                            variable={Variable.Temp}
                            placement="side"
                        />
                    </div>
                </div>
                <div className="grid gap-(--card-gap) md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="size-4 animate-spin" /> Fetching ten models for Nairobi…
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-[220px]" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-sm">
                                <StatusChip tone="info">Preview</StatusChip> Tracking started today
                            </CardTitle>
                        </CardHeader>
                        <CardContent>{chart(220)}</CardContent>
                    </Card>
                </div>
            </Section>
            <Section title="Disagreement and precipitation">
                <div className="grid gap-(--card-gap) lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                    <DisagreementTiles days={disagreement} variable={Variable.Temp} />
                    <ChartFrame
                        title="Precipitation, 6-hour totals"
                        description="Median bars, per-model ticks, chance of rain"
                    >
                        <PrecipPanel
                            steps={precip.steps}
                            series={precip.series}
                            median={precip.median}
                            chance={precip.chance}
                            timeZone={CITY.timezone}
                            locale={locale}
                        />
                    </ChartFrame>
                </div>
            </Section>
            <Section title="Evolution and convergence">
                <ChartFrame title={`Temperature for ${LAB_DUMP.evolution.validTime}`}>
                    <EvolutionChart
                        points={LAB_DUMP.evolution.points}
                        variable={Variable.Temp}
                        ariaLabel="Gallery evolution chart"
                    />
                </ChartFrame>
            </Section>
        </div>
    )
}

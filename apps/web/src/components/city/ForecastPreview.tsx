'use client'

import SpaghettiChart from '@/charts/SpaghettiChart'
import { City, LatestResponse } from '@/shared/api'
import { computeEnsemble } from '@/shared/ensemble'
import { Variable } from '@/shared/variables'
import { useLocale } from 'next-intl'
import { useMemo, useState } from 'react'

interface IProps {
    city: City
    latest: LatestResponse
    variable: Variable
    ariaLabel: string
    now: Date | null
    height?: number
    yDomain?: [number, number]
}

// `latest` is already on local 3-hour slots; a precipitation bar covers the 3 hours after its slot.
export default function ForecastPreview({ city, latest, variable, ariaLabel, now, height = 220, yDomain }: IProps) {
    const locale = useLocale()
    const [hoverIndex, setHoverIndex] = useState<number | null>(null)
    const stats = useMemo(
        () =>
            computeEnsemble(
                latest.series.map((s) => s.values),
                latest.steps.length,
            ),
        [latest],
    )

    return (
        <SpaghettiChart
            steps={latest.steps}
            series={latest.series}
            stats={stats}
            variable={variable}
            timeZone={city.timezone}
            locale={locale}
            ariaLabel={ariaLabel}
            hoverIndex={hoverIndex}
            onHoverIndex={setHoverIndex}
            height={height}
            yDomain={yDomain}
            now={now}
            compact
            showTooltip
        />
    )
}

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
    height?: number
    yDomain?: [number, number]
}

export default function ForecastPreview({ city, latest, variable, ariaLabel, height = 220, yDomain }: IProps) {
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
            compact
            showTooltip
        />
    )
}

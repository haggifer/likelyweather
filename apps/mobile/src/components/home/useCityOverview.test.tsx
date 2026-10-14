import { useCityOverview } from '@fa/hooks/useCityOverview'
import { City, LatestResponse } from '@fa/shared/api'
import { ModelId } from '@fa/shared/models'
import { PanelVariable } from '@fa/shared/overview-panels'
import { OVERVIEW_VARIABLES, Variable } from '@fa/shared/variables'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react-native'
import { ReactNode } from 'react'

const SLUG = 'kyiv-ua-703448'
const VISIBLE: PanelVariable[] = [Variable.Temp, Variable.Wind]

const CITY: City = {
    id: 703448,
    slug: SLUG,
    name: 'Kyiv',
    country: 'Ukraine',
    countryCode: 'UA',
    lat: 50.45,
    lon: 30.52,
    timezone: 'Europe/Kyiv',
}

const RUN: LatestResponse = {
    issueTime: '2026-10-14T06:00Z',
    fetchedAt: '2026-10-14T09:05:00.000Z',
    runId: 'test',
    steps: ['2026-10-14T09:00Z', '2026-10-14T10:00Z'],
    series: [{ modelId: ModelId.Gfs, values: [10, 11] }],
}

const createWrapper = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })

    client.setQueryData(['city', SLUG], CITY)
    OVERVIEW_VARIABLES.forEach((variable) => client.setQueryData(['latest', SLUG, variable], RUN))

    return ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
}

describe('useCityOverview', () => {
    it('keeps its series and panels across renders that change no query, such as a clock tick', async () => {
        const { result, rerender } = await renderHook(() => useCityOverview(SLUG, VISIBLE), {
            wrapper: createWrapper(),
        })
        const { hourly, readyPanels } = result.current

        await rerender({})

        expect(result.current.hourly).toBe(hourly)
        expect(result.current.readyPanels).toBe(readyPanels)
    })
})

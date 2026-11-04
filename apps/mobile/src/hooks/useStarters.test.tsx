import { apiGet } from '@fa/api-client/api'
import { getCityQueryKey } from '@fa/api-client/hooks/useCity'
import { useStarters } from '@fa/hooks/useStarters'
import { City } from '@fa/shared/api'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react-native'
import { ReactNode } from 'react'

jest.mock('@fa/api-client/api', () => ({
    ...jest.requireActual<object>('@fa/api-client/api'),
    apiGet: jest.fn(),
}))

const KYIV: City = {
    id: 703448,
    slug: 'kyiv-ua-703448',
    name: 'Kyiv',
    country: 'Ukraine',
    countryCode: 'UA',
    lat: 50.45,
    lon: 30.52,
    timezone: 'Europe/Kyiv',
    population: 2797553,
}

describe('useStarters', () => {
    it("stores each starter's record, so its overview asks for no city record of its own", async () => {
        jest.mocked(apiGet).mockResolvedValue({ items: [KYIV] })
        const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
        const wrapper = ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={client}>{children}</QueryClientProvider>
        )

        const { result } = await renderHook(() => useStarters(true), { wrapper })

        await waitFor(() => expect(result.current.data?.items).toEqual([KYIV]))
        expect(client.getQueryData(getCityQueryKey(KYIV.slug))).toEqual(KYIV)
    })
})

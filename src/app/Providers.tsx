'use client'

import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { makeStore } from '@/store'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { ReactNode, useState } from 'react'
import { Provider as ReduxProvider } from 'react-redux'

interface IProps {
    children: ReactNode
}

// Inlined at build time: with NEXT_PUBLIC_THEME_LAB=0 the branch is dead and the lab chunk is never emitted.
const ThemeLabRoot =
    process.env.NEXT_PUBLIC_THEME_LAB === '1' ? dynamic(() => import('@/theme/ThemeLabRoot'), { ssr: false }) : null

export default function Providers({ children }: IProps) {
    const [store] = useState(makeStore)
    const [queryClient] = useState(
        () => new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } } }),
    )

    return (
        <ReduxProvider store={store}>
            <QueryClientProvider client={queryClient}>
                <NuqsAdapter>
                    <TooltipProvider delayDuration={200}>
                        {children}
                        {ThemeLabRoot && <ThemeLabRoot />}
                        <Toaster position="bottom-right" />
                    </TooltipProvider>
                </NuqsAdapter>
            </QueryClientProvider>
        </ReduxProvider>
    )
}

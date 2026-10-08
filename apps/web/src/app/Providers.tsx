'use client'

import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { makeStore } from '@/store'
import { makeQueryClient } from '@fa/api-client/query-client'
import { QueryClientProvider } from '@tanstack/react-query'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { ReactNode, useState } from 'react'
import { Provider as ReduxProvider } from 'react-redux'

interface IProps {
    children: ReactNode
}

export function Providers({ children }: IProps) {
    const [store] = useState(makeStore)
    const [queryClient] = useState(makeQueryClient)

    return (
        <ReduxProvider store={store}>
            <QueryClientProvider client={queryClient}>
                <NuqsAdapter>
                    <TooltipProvider delayDuration={200}>
                        {children}
                        <Toaster position="bottom-right" />
                    </TooltipProvider>
                </NuqsAdapter>
            </QueryClientProvider>
        </ReduxProvider>
    )
}

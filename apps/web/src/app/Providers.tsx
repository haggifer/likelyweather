'use client'

import { Toaster } from '@fa/ui/components/sonner'
import { TooltipProvider } from '@fa/ui/components/tooltip'
import { makeQueryClient } from '@/lib/queryClient'
import { makeStore } from '@/store'
import { QueryClientProvider } from '@tanstack/react-query'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { ReactNode, useState } from 'react'
import { Provider as ReduxProvider } from 'react-redux'

interface IProps {
    children: ReactNode
}

export default function Providers({ children }: IProps) {
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

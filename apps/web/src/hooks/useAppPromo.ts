import { useMediaQuery } from '@/hooks/useMediaQuery'
import { DISMISSED_AT_KEY, getDevicePlatform, isAppPromoShown, PromoPlatform } from '@/lib/app-promo'
import { usePathname } from 'next/navigation'
import { useSyncExternalStore } from 'react'

export interface UseAppPromoResult {
    isVisible: boolean
    url: string | undefined
    dismiss: () => void
}

// Inlined at build time; unset until there is a release to link to.
const PROMO_URL = process.env.NEXT_PUBLIC_APP_PROMO_URL
const DISMISS_EVENT = 'apppromodismiss'
// Below Tailwind's `sm` breakpoint (62rem, globals.css), the phone layouts' limit.
const PHONE_QUERY = '(max-width: 61.9375rem)'

const subscribeToNothing = () => () => {}

const subscribeDismiss = (onChange: () => void) => {
    window.addEventListener(DISMISS_EVENT, onChange)

    return () => window.removeEventListener(DISMISS_EVENT, onChange)
}

// User-Agent Client Hints are not in TypeScript's DOM types yet.
type NavigatorWithHints = Navigator & { userAgentData?: { platform?: string } }

const getPlatform = (): PromoPlatform | null =>
    getDevicePlatform(navigator.userAgent, (navigator as NavigatorWithHints).userAgentData?.platform)

const getDismissedAt = () => {
    try {
        return localStorage.getItem(DISMISSED_AT_KEY)
    } catch {
        return null
    }
}

const getNothing = () => null

const dismiss = () => {
    try {
        localStorage.setItem(DISMISSED_AT_KEY, new Date().toISOString())
    } catch {
        // storage can be blocked; the banner still closes for this page
    }

    window.dispatchEvent(new Event(DISMISS_EVENT))
}

// Decided on the client only: the server HTML is the same for every visitor, and the banner appears after hydration.
export function useAppPromo(): UseAppPromoResult {
    const pathname = usePathname()
    const isCoarsePointer = useMediaQuery('(pointer: coarse)')
    const isPhoneWidth = useMediaQuery(PHONE_QUERY)
    const platform = useSyncExternalStore(subscribeToNothing, getPlatform, getNothing)
    const dismissedAt = useSyncExternalStore(subscribeDismiss, getDismissedAt, getNothing)

    const isVisible = isAppPromoShown({
        url: PROMO_URL,
        pathname,
        isCoarsePointer,
        isPhoneWidth,
        platform,
        dismissedAt,
        now: new Date(),
    })

    return { isVisible, url: PROMO_URL, dismiss }
}

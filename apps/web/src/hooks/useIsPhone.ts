import { useMediaQuery } from '@/hooks/useMediaQuery'

// Below Tailwind's `sm` (62rem, globals.css), where the phone layout applies.
const PHONE_QUERY = '(width < 62rem)'

// False during server rendering and hydration, like `useMediaQuery`.
export function useIsPhone(): boolean {
    return useMediaQuery(PHONE_QUERY)
}

import { useSyncExternalStore } from 'react'

// False during server rendering and hydration, so markup that depends on it never mismatches the server HTML.
export default function useMediaQuery(query: string): boolean {
    return useSyncExternalStore(
        (onChange) => {
            const list = window.matchMedia(query)
            list.addEventListener('change', onChange)
            return () => list.removeEventListener('change', onChange)
        },
        () => window.matchMedia(query).matches,
        () => false,
    )
}

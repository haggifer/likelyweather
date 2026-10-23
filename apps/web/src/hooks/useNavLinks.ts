import { usePlaces } from '@/hooks/usePlaces'
import { getDefaultPlace } from '@fa/shared/places'
import { usePathname, useRouter } from 'next/navigation'
import { MouseEvent } from 'react'

export type NavKey = 'overview' | 'details' | 'archive' | 'methodology'

interface NavLink {
    key: NavKey
    href: string
    isCurrent: boolean
}

export interface UseNavLinksResult {
    links: NavLink[]
    // Follows Details to the city the page shows, when it shows one.
    handleClick: (link: NavLink, e: MouseEvent<HTMLAnchorElement>) => void
}

const CITY_PATH = /^\/city\/([^/]+)/

// The city on screen: the overview's or the archive's `?city=`, or a dashboard's own. Read on the click rather than
// while rendering, because reading the URL in the header would make Next render every static page in the browser.
const getShownCity = () =>
    new URLSearchParams(window.location.search).get('city') ?? window.location.pathname.match(CITY_PATH)?.[1] ?? null

const isPlainClick = (e: MouseEvent<HTMLAnchorElement>) =>
    e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey

// The header's pages: the overview, a city's details, the archive and the methodology. Details opens the city the
// overview shows: the one picked on the page, or else the overview's default place; a city's dashboard is that page,
// whichever city it shows.
export function useNavLinks(): UseNavLinksResult {
    const pathname = usePathname()
    const router = useRouter()
    const places = usePlaces()

    const place = places ? getDefaultPlace(places) : null

    const links: NavLink[] = [
        { key: 'overview', href: '/', isCurrent: pathname === '/' },
        { key: 'details', href: place ? `/city/${place.slug}` : '/', isCurrent: CITY_PATH.test(pathname) },
        { key: 'archive', href: '/archive', isCurrent: pathname === '/archive' },
        { key: 'methodology', href: '/methodology', isCurrent: pathname === '/methodology' },
    ]

    const handleClick = (link: NavLink, e: MouseEvent<HTMLAnchorElement>) => {
        const city = link.key === 'details' && isPlainClick(e) ? getShownCity() : null

        if (!city) return

        e.preventDefault()
        router.push(`/city/${city}`)
    }

    return { links, handleClick }
}

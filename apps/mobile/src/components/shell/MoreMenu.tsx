import { getDefaultPlace } from '@fa/shared/places'
import { Href, usePathname, useRouter } from 'expo-router'
import { Archive, BookOpen, ChartSpline, CloudSun, LucideIcon, Menu, Settings } from 'lucide-react-native'
import { useTranslations } from 'use-intl'
import { usePlaces } from '../../hooks/usePlaces'
import { useSelectedCity } from '../../hooks/useSelectedCity'
import { Button } from '../ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { Icon } from '../ui/icon'
import { Text } from '../ui/text'

interface MenuItem {
    key: 'forecast' | 'details' | 'archive' | 'methodology' | 'settings'
    icon: LucideIcon
    href: Href
}

const HOME: Href = '/'
// 36 px rows (author, 2026-10-16), like the web's phone menu and the language options.
const ITEM = 'min-h-9 gap-2.5 px-4'

const getItems = (citySlug: string | null): MenuItem[] => [
    { key: 'forecast', icon: CloudSun, href: HOME },
    { key: 'details', icon: ChartSpline, href: citySlug ? `/city/${citySlug}` : HOME },
    { key: 'archive', icon: Archive, href: '/archive' },
    { key: 'methodology', icon: BookOpen, href: '/methodology' },
    { key: 'settings', icon: Settings, href: '/settings' },
]

// The web header's pages (Forecast, Details, the Archive, then Methodology), on every screen's header; Settings joins
// them because the app has no top-bar controls for language and theme. Details opens the city Home's overview shows.
export function MoreMenu() {
    const t = useTranslations('nav')
    const tm = useTranslations('mobile')
    const router = useRouter()
    const pathname = usePathname()
    const places = usePlaces()
    const selectedCity = useSelectedCity()

    const items = getItems(selectedCity ?? getDefaultPlace(places)?.slug ?? null)
    const labels = {
        forecast: t('forecast'),
        details: t('details'),
        archive: t('archive'),
        methodology: t('methodology'),
        settings: tm('settings'),
    }

    // Forecast goes back to Home rather than stacking a second one, and a page already on screen stays as it is.
    const handleNavigate = (href: Href) => {
        if (href === HOME) {
            if (pathname !== HOME) router.dismissTo(HOME)
        } else if (href !== pathname) {
            router.push(href)
        }
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" hitSlop={4} aria-label={t('more')} className="size-9">
                    <Icon as={Menu} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={4} className="w-48">
                {items.map(({ key, icon, href }) => (
                    <DropdownMenuItem
                        key={key}
                        textValue={labels[key]}
                        onPress={() => handleNavigate(href)}
                        className={ITEM}
                    >
                        <Icon as={icon} className="size-4" />
                        <Text>{labels[key]}</Text>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

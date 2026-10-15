import { Href, usePathname, useRouter } from 'expo-router'
import { Archive, BookOpen, CloudSun, LucideIcon, Menu, Settings } from 'lucide-react-native'
import { useTranslations } from 'use-intl'
import { Button } from '../ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { Icon } from '../ui/icon'
import { Text } from '../ui/text'

interface MenuItem {
    key: 'forecast' | 'archive' | 'methodology' | 'settings'
    icon: LucideIcon
    href: Href
}

const HOME: Href = '/'
const ITEMS: MenuItem[] = [
    { key: 'forecast', icon: CloudSun, href: HOME },
    { key: 'archive', icon: Archive, href: '/archive' },
    { key: 'methodology', icon: BookOpen, href: '/methodology' },
    { key: 'settings', icon: Settings, href: '/settings' },
]
// Finger-sized rows (author, 2026-10-13), like the web's phone menu.
const ITEM = 'min-h-12 gap-2.5 px-4'

// The web header's pages (Forecast, the Archive, then Methodology), on every screen's header; Settings joins them
// because the app has no top-bar controls for language and theme.
export function MoreMenu() {
    const t = useTranslations('nav')
    const tm = useTranslations('mobile')
    const router = useRouter()
    const pathname = usePathname()

    const labels = {
        forecast: t('forecast'),
        archive: t('archive'),
        methodology: t('methodology'),
        settings: tm('settings'),
    }

    // Forecast goes back to Home rather than stacking a second one.
    const handleNavigate = (href: Href) => {
        if (href !== HOME) {
            router.push(href)
        } else if (pathname !== HOME) {
            router.dismissTo(HOME)
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
                {ITEMS.map(({ key, icon, href }) => (
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

import { Star } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { cn } from '../../lib/cn'
import { Icon } from '../ui/icon'

interface IProps {
    isPinned: boolean
    size: number
    tone: 'default' | 'inverse'
}

// A place's star, filled once it is pinned: the favorite toggle's face, and on its own the chips' read-only mark.
export function FavoriteStar({ isPinned, size, tone }: IProps) {
    const { colors } = useTheme()

    return (
        <Icon
            as={Star}
            size={size}
            // The fill is an SVG attribute, which takes a colour value rather than a class.
            fill={isPinned ? colors['favorite-fill'] : 'transparent'}
            className={cn(
                isPinned && 'text-favorite',
                !isPinned && (tone === 'inverse' ? 'text-primary-foreground' : 'text-favorite-idle'),
            )}
        />
    )
}

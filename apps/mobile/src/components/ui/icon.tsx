import type { LucideIcon, LucideProps } from 'lucide-react-native'
import * as React from 'react'
import { withUniwind } from 'uniwind'
import { cn } from '../../lib/cn'
import { TextClassContext } from './text'

// The size a kit part gives the icons inside it, as the web's `[&_svg:not([class*='size-'])]:size-4` does; an icon's
// own size class still wins.
const IconClassContext = React.createContext<string | undefined>(undefined)

type IconProps = LucideProps & {
    as: LucideIcon
} & React.RefAttributes<LucideIcon>

function IconImpl({ as: IconComponent, ...props }: IconProps) {
    return <IconComponent {...props} />
}

const StyledIcon = withUniwind(IconImpl, {
    size: {
        fromClassName: 'className',
        styleProperty: 'width',
    },
    color: {
        fromClassName: 'className',
        styleProperty: 'color',
    },
})

function Icon({ as: IconComponent, className, ...props }: IconProps) {
    const textClass = React.useContext(TextClassContext)
    const iconClass = React.useContext(IconClassContext)
    return (
        <StyledIcon
            as={IconComponent}
            className={cn('text-foreground size-5', textClass, iconClass, className)}
            {...props}
        />
    )
}

export { Icon, IconClassContext }

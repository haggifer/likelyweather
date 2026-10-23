import { ReactElement, ReactNode } from 'react'
import { Popover, PopoverHint, PopoverTrigger } from '../ui/popover'
import { Text } from '../ui/text'

interface IProps {
    content: ReactNode
    children: ReactElement
    className?: string
}

// The web's Hint on a touch screen. The control gets the tap, so it takes no action of its own (a Refresh with
// nothing to fetch).
export function Hint({ content, children, className }: IProps) {
    return (
        <Popover>
            <PopoverTrigger asChild>{children}</PopoverTrigger>
            <PopoverHint className={className}>
                {typeof content === 'string' ? <Text>{content}</Text> : content}
            </PopoverHint>
        </Popover>
    )
}

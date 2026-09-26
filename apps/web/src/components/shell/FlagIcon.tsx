import { cn } from '@fa/ui/lib/utils'
import Image from 'next/image'

interface IProps {
    countryCode: string
    className?: string
}

export default function FlagIcon({ countryCode, className }: IProps) {
    return (
        <Image
            src={`/flags/${countryCode.toUpperCase()}.svg`}
            alt=""
            width={18}
            height={12}
            unoptimized
            className={cn(
                'inline-block h-3 w-[18px] shrink-0 rounded-[2px] object-cover ring-1 ring-border',
                className,
            )}
        />
    )
}

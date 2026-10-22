'use client'

import { Button } from '@/components/ui/button'
import { useViewMode } from '@/hooks/useViewMode'
import { BarChart3, Table2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface IProps {
    className?: string
}

// The overview's and the archive's chart or table switch: an icon on phones, labelled from `sm` up.
export function ViewModeToggle({ className }: IProps) {
    const t = useTranslations('chart')
    const { isTable, toggleTable } = useViewMode()

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={toggleTable}
            aria-pressed={isTable}
            aria-label={isTable ? t('showChart') : t('showTable')}
            className={className}
        >
            {isTable ? <BarChart3 /> : <Table2 />}
            <span className="max-sm:sr-only">{isTable ? t('chart') : t('table')}</span>
        </Button>
    )
}

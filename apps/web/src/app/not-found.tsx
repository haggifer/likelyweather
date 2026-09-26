import { Button } from '@fa/ui/components/button'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'

export default async function NotFound() {
    const t = await getTranslations('notFound')

    return (
        <div className="flex flex-col items-center gap-3 py-24 text-center">
            <h1 className="text-2xl font-bold">{t('title')}</h1>
            <p className="text-muted-foreground">{t('body')}</p>
            <Button asChild variant="outline">
                <Link href="/">{t('home')}</Link>
            </Button>
        </div>
    )
}

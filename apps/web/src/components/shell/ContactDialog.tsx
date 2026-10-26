'use client'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { getErrorKind } from '@fa/api-client/error-kind'
import { useSendContact } from '@fa/api-client/hooks/useSendContact'
import { CONTACT_EMAIL_MAX, CONTACT_MESSAGE_MAX, Locale } from '@fa/shared/api'
import { isContactReady } from '@fa/shared/contact'
import { useLocale, useTranslations } from 'next-intl'
import { FormEvent, useState } from 'react'

const BUTTON = 'touch:hit-area'

// The form lives inside the dialog's content, which unmounts on close, so every opening starts empty.
const ContactForm = () => {
    const t = useTranslations('contact')
    const te = useTranslations('errors')
    const locale = useLocale() as Locale

    const [email, setEmail] = useState('')
    const [message, setMessage] = useState('')
    const [website, setWebsite] = useState('')

    const send = useSendContact()

    const isReady = isContactReady({ email, message })

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault()

        if (!isReady || send.isPending) return

        send.mutate({ email: email.trim(), message, website, locale, source: 'web' })
    }

    if (send.isSuccess) {
        return (
            <>
                <DialogDescription role="status">{t('sent')}</DialogDescription>
                <DialogClose asChild>
                    <Button size="lg" className={`${BUTTON} self-end`}>
                        {t('close')}
                    </Button>
                </DialogClose>
            </>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <DialogDescription>{t('intro')}</DialogDescription>
            <Input
                type="email"
                inputMode="email"
                autoComplete="email"
                maxLength={CONTACT_EMAIL_MAX}
                placeholder={t('emailPlaceholder')}
                aria-label={t('email')}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
            />
            <Textarea
                maxLength={CONTACT_MESSAGE_MAX}
                placeholder={t('messagePlaceholder')}
                aria-label={t('message')}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="max-h-60 min-h-32"
            />
            {/* Unseen, unread and out of the tab order: only a bot that fills every field fills it in. */}
            <div aria-hidden className="sr-only">
                <Input
                    tabIndex={-1}
                    autoComplete="off"
                    name="website"
                    value={website}
                    onChange={(event) => setWebsite(event.target.value)}
                />
            </div>
            {send.isError && (
                <p role="alert" className="text-sm text-destructive">
                    {te(getErrorKind(send.error))}
                </p>
            )}
            <div className="flex justify-end gap-2">
                <DialogClose asChild>
                    <Button type="button" variant="outline" size="lg" className={BUTTON}>
                        {t('cancel')}
                    </Button>
                </DialogClose>
                <Button type="submit" size="lg" disabled={!isReady || send.isPending} className={BUTTON}>
                    {send.isPending ? t('sending') : t('send')}
                </Button>
            </div>
        </form>
    )
}

interface IProps {
    triggerClassName: string
}

export function ContactDialog({ triggerClassName }: IProps) {
    const t = useTranslations('contact')

    return (
        <Dialog>
            <DialogTrigger className={triggerClassName}>{t('title')}</DialogTrigger>
            <DialogContent className="flex w-[26rem] flex-col gap-3 p-4">
                <DialogTitle>{t('title')}</DialogTitle>
                <ContactForm />
            </DialogContent>
        </Dialog>
    )
}

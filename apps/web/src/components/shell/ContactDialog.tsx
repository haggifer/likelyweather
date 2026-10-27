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
import { cn } from '@/lib/cn'
import { getErrorKind } from '@fa/api-client/error-kind'
import { useSendContact } from '@fa/api-client/hooks/useSendContact'
import { CONTACT_EMAIL_MAX, CONTACT_MESSAGE_MAX } from '@fa/shared/api'
import { isContactEmailValid, isContactReady } from '@fa/shared/contact'
import { useTranslations } from 'next-intl'
import { FormEvent, useId, useState } from 'react'
import { toast } from 'sonner'

const BUTTON = 'touch:hit-area'
// Phones get the whole width, 1rem in from each side, as in the app. From 480 px down the dialog takes its whole height
// cap and the message field fills what the rest of the form leaves, as the form's own height leaves a narrow field.
const CONTENT =
    'flex max-h-[min(36rem,calc(100dvh-2rem))] w-[37.5rem] flex-col gap-3 p-4 max-sm:w-[calc(100vw-2rem)] max-sm:max-w-none [@media(width<=30rem)]:h-[min(36rem,calc(100dvh-2rem))]'
const NARROW_FILL = '[@media(width<=30rem)]:min-h-0 [@media(width<=30rem)]:flex-1'
const MESSAGE = 'max-h-60 min-h-32 [@media(width<=30rem)]:max-h-[36rem] [@media(width<=30rem)]:flex-1'

// The form lives inside the dialog's content, which unmounts on close, so every opening starts empty.
const ContactForm = ({ onClose }: { onClose: () => void }) => {
    const t = useTranslations('contact')
    const te = useTranslations('errors')

    const [email, setEmail] = useState('')
    const [message, setMessage] = useState('')
    const [website, setWebsite] = useState('')
    const [isEmailTouched, setIsEmailTouched] = useState(false)
    const emailErrorId = useId()

    const send = useSendContact({
        onSuccess: () => toast.success(t('sent')),
        onErrorAfterUnmount: (error) => toast.error(t('notSent', { reason: te(getErrorKind(error)) })),
    })

    const isReady = isContactReady({ email, message })
    // Judged once the reader leaves the field, so the message doesn't flash while the address is being typed.
    const isEmailInvalid = isEmailTouched && email.trim() !== '' && !isContactEmailValid(email)

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault()

        if (!isReady || send.isPending) return

        send.mutate({ email: email.trim(), message, website }, { onSuccess: onClose })
    }

    return (
        <form onSubmit={handleSubmit} className={cn('flex flex-col gap-3', NARROW_FILL)}>
            <DialogDescription>{t('intro')}</DialogDescription>
            <div className="flex flex-col gap-1">
                <Input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    maxLength={CONTACT_EMAIL_MAX}
                    placeholder={t('emailPlaceholder')}
                    aria-label={t('email')}
                    aria-invalid={isEmailInvalid || undefined}
                    aria-describedby={isEmailInvalid ? emailErrorId : undefined}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    onBlur={() => setIsEmailTouched(true)}
                />
                {isEmailInvalid && (
                    <p id={emailErrorId} className="text-sm text-destructive">
                        {t('emailInvalid')}
                    </p>
                )}
            </div>
            <div className={cn('flex flex-col gap-1', NARROW_FILL)}>
                <Textarea
                    maxLength={CONTACT_MESSAGE_MAX}
                    placeholder={t('messagePlaceholder')}
                    aria-label={t('message')}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    className={MESSAGE}
                />
                <p className="self-end text-xs text-muted-foreground tabular-nums">
                    {message.length}/{CONTACT_MESSAGE_MAX}
                </p>
            </div>
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

    const [isOpen, setIsOpen] = useState(false)

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger className={triggerClassName}>{t('title')}</DialogTrigger>
            <DialogContent className={CONTENT}>
                <DialogTitle className="text-lg">{t('title')}</DialogTitle>
                <ContactForm onClose={() => setIsOpen(false)} />
            </DialogContent>
        </Dialog>
    )
}

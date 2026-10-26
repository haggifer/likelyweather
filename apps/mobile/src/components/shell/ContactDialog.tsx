import { getErrorKind } from '@fa/api-client/error-kind'
import { useSendContact } from '@fa/api-client/hooks/useSendContact'
import { CONTACT_EMAIL_MAX, CONTACT_MESSAGE_MAX, Locale } from '@fa/shared/api'
import { isContactReady } from '@fa/shared/contact'
import { useState } from 'react'
import { View } from 'react-native'
import { useLocale, useTranslations } from 'use-intl'
import { Button } from '../ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '../ui/dialog'
import { Input } from '../ui/input'
import { Text } from '../ui/text'
import { Textarea } from '../ui/textarea'

// The form lives inside the dialog's content, which unmounts on close, so every opening starts empty. No bot fills in
// the app, so it has no honeypot field.
const ContactForm = () => {
    const t = useTranslations('contact')
    const te = useTranslations('errors')
    const locale = useLocale() as Locale

    const [email, setEmail] = useState('')
    const [message, setMessage] = useState('')

    const send = useSendContact()

    const isReady = isContactReady({ email, message })

    const handleSend = () => send.mutate({ email: email.trim(), message, locale, source: 'app' })

    if (send.isSuccess) {
        return (
            <>
                <DialogDescription role="status">{t('sent')}</DialogDescription>
                <DialogClose asChild>
                    <Button size="lg" className="self-end">
                        <Text>{t('close')}</Text>
                    </Button>
                </DialogClose>
            </>
        )
    }

    return (
        <>
            <DialogDescription>{t('intro')}</DialogDescription>
            <Input
                value={email}
                onChangeText={setEmail}
                placeholder={t('emailPlaceholder')}
                accessibilityLabel={t('email')}
                keyboardType="email-address"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={CONTACT_EMAIL_MAX}
            />
            <Textarea
                value={message}
                onChangeText={setMessage}
                placeholder={t('messagePlaceholder')}
                accessibilityLabel={t('message')}
                maxLength={CONTACT_MESSAGE_MAX}
                className="max-h-60 min-h-32"
            />
            {send.isError && (
                <Text role="alert" className="text-sm text-destructive">
                    {te(getErrorKind(send.error))}
                </Text>
            )}
            <View className="flex-row justify-end gap-2">
                <DialogClose asChild>
                    <Button variant="outline" size="lg">
                        <Text>{t('cancel')}</Text>
                    </Button>
                </DialogClose>
                <Button size="lg" disabled={!isReady || send.isPending} onPress={handleSend}>
                    <Text>{send.isPending ? t('sending') : t('send')}</Text>
                </Button>
            </View>
        </>
    )
}

interface IProps {
    isOpen: boolean
    onOpenChange: (isOpen: boolean) => void
}

export function ContactDialog({ isOpen, onOpenChange }: IProps) {
    const t = useTranslations('contact')

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="w-full max-w-[26rem] gap-3 p-4">
                <DialogTitle>{t('title')}</DialogTitle>
                <ContactForm />
            </DialogContent>
        </Dialog>
    )
}

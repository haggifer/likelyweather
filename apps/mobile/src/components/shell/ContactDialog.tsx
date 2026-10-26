import { getErrorKind } from '@fa/api-client/error-kind'
import { useSendContact } from '@fa/api-client/hooks/useSendContact'
import { CONTACT_EMAIL_MAX, CONTACT_MESSAGE_MAX, Locale } from '@fa/shared/api'
import { isContactEmailValid, isContactReady } from '@fa/shared/contact'
import { useState } from 'react'
import { KeyboardAvoidingView, View } from 'react-native'
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
    const [isEmailTouched, setIsEmailTouched] = useState(false)

    const send = useSendContact()

    const isReady = isContactReady({ email, message })
    // Judged once the reader leaves the field, so the message doesn't flash while the address is being typed.
    const isEmailInvalid = isEmailTouched && email.trim() !== '' && !isContactEmailValid(email)

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
            <View className="gap-1">
                <Input
                    value={email}
                    onChangeText={setEmail}
                    onBlur={() => setIsEmailTouched(true)}
                    placeholder={t('emailPlaceholder')}
                    accessibilityLabel={t('email')}
                    aria-invalid={isEmailInvalid}
                    keyboardType="email-address"
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={CONTACT_EMAIL_MAX}
                    className={isEmailInvalid ? 'border-destructive' : undefined}
                />
                {isEmailInvalid && (
                    <Text accessibilityLiveRegion="polite" className="text-sm text-destructive">
                        {t('emailInvalid')}
                    </Text>
                )}
            </View>
            <View className="flex-1 gap-1">
                <Textarea
                    value={message}
                    onChangeText={setMessage}
                    placeholder={t('messagePlaceholder')}
                    accessibilityLabel={t('message')}
                    maxLength={CONTACT_MESSAGE_MAX}
                    className="min-h-32 flex-1"
                />
                <Text className="self-end text-xs text-muted-foreground tabular-nums">
                    {message.length}/{CONTACT_MESSAGE_MAX}
                </Text>
            </View>
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
            {/* The web's phone layout: the whole screen, 1rem in from every side (the overlay's 0.5rem and this margin). */}
            <DialogContent className="m-2 flex-1 self-stretch p-4">
                {/* The full-height dialog would otherwise end under the keyboard, Send with it. */}
                <KeyboardAvoidingView behavior="padding" className="flex-1 gap-3">
                    <DialogTitle className="text-lg">{t('title')}</DialogTitle>
                    <ContactForm />
                </KeyboardAvoidingView>
            </DialogContent>
        </Dialog>
    )
}

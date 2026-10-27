import { getErrorKind } from '@fa/api-client/error-kind'
import { useSendContact } from '@fa/api-client/hooks/useSendContact'
import { CONTACT_EMAIL_MAX, CONTACT_MESSAGE_MAX } from '@fa/shared/api'
import { isContactEmailValid, isContactReady } from '@fa/shared/contact'
import { useState } from 'react'
import { View } from 'react-native'
import { useTranslations } from 'use-intl'
import { showSnackbar } from '../../lib/snackbar-store'
import { Button } from '../ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '../ui/dialog'
import { Input } from '../ui/input'
import { Text } from '../ui/text'
import { Textarea } from '../ui/textarea'

// The web's phone layout: the content's height up to 36rem, and the whole width 1rem in from each side (the overlay's
// 0.5rem and this margin). From 480 px down the dialog takes its whole height cap and the message field fills what the
// rest of the form leaves, as the form's own height leaves a narrow field.
const CONTENT = 'm-2 max-h-[36rem] shrink gap-3 self-stretch p-4 [@media(width<=30rem)]:h-[36rem]'
const MESSAGE = 'max-h-60 min-h-32 shrink [@media(width<=30rem)]:max-h-[36rem] [@media(width<=30rem)]:flex-1'

// The form lives inside the dialog's content, which unmounts on close, so every opening starts empty. No bot fills in
// the app, so it has no honeypot field.
const ContactForm = ({ onClose }: { onClose: () => void }) => {
    const t = useTranslations('contact')
    const te = useTranslations('errors')

    const [email, setEmail] = useState('')
    const [message, setMessage] = useState('')
    const [isEmailTouched, setIsEmailTouched] = useState(false)

    const send = useSendContact({
        onSuccess: () => showSnackbar(t('sent'), [], { kind: 'success' }),
        onErrorAfterUnmount: (error) =>
            showSnackbar(t('notSent', { reason: te(getErrorKind(error)) }), [], { kind: 'error' }),
    })

    const isReady = isContactReady({ email, message })
    // Judged once the reader leaves the field, so the message doesn't flash while the address is being typed.
    const isEmailInvalid = isEmailTouched && email.trim() !== '' && !isContactEmailValid(email)

    const handleSend = () => send.mutate({ email: email.trim(), message }, { onSuccess: onClose })

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
            {/* Gives up height first when the keyboard leaves the dialog less than it needs. */}
            <View className="shrink gap-1 [@media(width<=30rem)]:flex-1">
                <Textarea
                    value={message}
                    onChangeText={setMessage}
                    placeholder={t('messagePlaceholder')}
                    accessibilityLabel={t('message')}
                    maxLength={CONTACT_MESSAGE_MAX}
                    className={MESSAGE}
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
            <DialogContent className={CONTENT}>
                <DialogTitle className="text-lg">{t('title')}</DialogTitle>
                <ContactForm onClose={() => onOpenChange(false)} />
            </DialogContent>
        </Dialog>
    )
}

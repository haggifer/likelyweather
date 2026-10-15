import { getErrorKind } from '@fa/api-client/error-kind'
import { CircleAlert, RefreshCw } from 'lucide-react-native'
import { View } from 'react-native'
import { useTranslations } from 'use-intl'
import { Alert, AlertDescription } from './alert'
import { Button } from './button'
import { Icon } from './icon'
import { Text } from './text'

interface IProps {
    error: unknown
    onRetry?: () => void
}

// The web's ErrorNotice: the kit's alert with the error's copy, and a way to try again under it.
export function ErrorNotice({ error, onRetry }: IProps) {
    const t = useTranslations('errors')

    return (
        <Alert icon={CircleAlert}>
            <AlertDescription>{t(getErrorKind(error))}</AlertDescription>
            {onRetry && (
                <View className="mt-2 items-start pl-6">
                    <Button variant="outline" size="sm" onPress={onRetry} className="h-9">
                        <Icon as={RefreshCw} />
                        <Text>{t('retry')}</Text>
                    </Button>
                </View>
            )}
        </Alert>
    )
}

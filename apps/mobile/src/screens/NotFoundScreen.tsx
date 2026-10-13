import { useRouter } from 'expo-router'
import { View } from 'react-native'
import { useTranslations } from 'use-intl'
import { Button } from '../components/ui/button'
import { Text } from '../components/ui/text'

// The web's not-found page, for a link into the app that names no screen. The way back pops to the start screen when
// it is in the stack, so Back never returns here.
export function NotFoundScreen() {
    const t = useTranslations('notFound')
    const router = useRouter()

    return (
        <View className="flex-1 items-center justify-center gap-3 bg-background p-6">
            <Text role="heading" className="text-center text-2xl font-bold">
                {t('title')}
            </Text>
            <Text className="text-center text-sm leading-relaxed text-muted-foreground">{t('body')}</Text>
            <Button variant="outline" onPress={() => router.dismissTo('/')}>
                <Text>{t('home')}</Text>
            </Button>
        </View>
    )
}

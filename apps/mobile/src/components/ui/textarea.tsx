import { Platform, TextInput } from 'react-native'
import { cn } from '../../lib/cn'
import { getFontFamily } from '../../theme/fonts'

// React Native Reusables' Textarea, styled as the web's (apps/web/src/components/ui/textarea.tsx) and with the
// app's font, as the kit's Input.
function Textarea({
    className,
    multiline = true,
    ...props
}: React.ComponentProps<typeof TextInput> & React.RefAttributes<TextInput>) {
    return (
        <TextInput
            className={cn(
                'dark:bg-input/30 border-border bg-background text-foreground flex min-h-16 w-full flex-row rounded-md border px-3 py-2 text-base shadow-sm shadow-black/5',
                Platform.select({
                    web: 'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive field-sizing-content resize-y outline-none transition-[color,box-shadow] focus-visible:ring-[3px] disabled:cursor-not-allowed',
                }),
                props.editable === false && 'opacity-50',
                className,
            )}
            placeholderTextColorClassName="accent-muted-foreground"
            multiline={multiline}
            textAlignVertical="top"
            {...props}
            style={[{ fontFamily: getFontFamily('400') }, props.style]}
        />
    )
}

export { Textarea }

interface SettingOptions {
    name: string
    value: string | undefined
    fallback: string
    // A deploy may not fall back: the placeholder would reach AWS, such as alarms mailed to example.com.
    isRequired: boolean
}

// An unset GitHub variable arrives as an empty string, so an empty value counts as unset.
export const resolveSetting = ({ name, value, fallback, isRequired }: SettingOptions) => {
    if (value) return value

    if (isRequired) throw new Error(`${name} is not set; a deploy needs it (-c ${name}=… or its environment variable)`)

    return fallback
}

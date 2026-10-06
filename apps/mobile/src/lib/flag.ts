const REGIONAL_INDICATOR_A = 0x1f1e6
const LETTER_A = 65

// A country's flag as its two regional-indicator characters, which Android draws as the flag emoji.
export const getFlagEmoji = (countryCode: string) =>
    String.fromCodePoint(
        ...[...countryCode.toUpperCase().slice(0, 2)].map((c) => REGIONAL_INDICATOR_A + c.charCodeAt(0) - LETTER_A),
    )

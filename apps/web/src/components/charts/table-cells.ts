// The time column of a sideways-scrolling table. The other columns scroll under it, so its background stays opaque:
// the hover colour is the row's muted/50 tint mixed into the card colour instead of laid over it. On phones it stands
// apart on the muted background (author, 2026-10-16).
export const STICKY_TIME_CELL =
    'sticky left-0 z-1 bg-card max-sm:bg-muted group-hover:bg-[color-mix(in_srgb,var(--color-muted)_50%,var(--color-card))]'

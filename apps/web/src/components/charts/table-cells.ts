// The box a value table scrolls in, both ways at once, so its header can stick to the top and its time column to the
// left, and the sideways scrollbar sits at the box's bottom edge rather than under the last row. Styling the scrollbar
// makes Chrome draw a classic one that stays visible instead of fading; `scrollbar-width` or
// `scrollbar-color` would make Chrome ignore these rules. The kit's own sideways container lets the table through.
export const TABLE_SCROLL =
    'overflow-auto *:data-[slot=table-container]:overflow-visible [&::-webkit-scrollbar]:size-2 [&::-webkit-scrollbar-corner]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent'

// The other columns scroll under the time column, so its background stays opaque: the hover colour is the row's
// muted/50 tint mixed into the card colour instead of laid over it.
export const STICKY_TIME_CELL =
    'sticky left-0 z-1 bg-card max-sm:bg-muted group-hover:bg-[color-mix(in_srgb,var(--color-muted)_50%,var(--color-card))]'

// A sticky cell leaves its row's border behind, so the cell draws the line itself.
export const STICKY_HEAD_CELL = 'sticky top-0 z-2 bg-muted shadow-[inset_0_-1px_var(--color-border)]'

// The time column's head sits over both the header row and the time column.
export const STICKY_CORNER_CELL = 'sticky top-0 left-0 z-3 bg-muted shadow-[inset_0_-1px_var(--color-border)]'

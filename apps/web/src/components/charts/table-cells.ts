// Styling the scrollbar makes Chrome draw a classic one that stays visible instead of fading; `scrollbar-width` or
// `scrollbar-color` would make Chrome ignore these rules. The kit's own sideways container lets the table through.
export const TABLE_SCROLL =
    'overflow-auto *:data-[slot=table-container]:overflow-visible [&::-webkit-scrollbar]:size-2 [&::-webkit-scrollbar-corner]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent'

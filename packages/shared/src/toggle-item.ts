// Adds the item to the list, or removes it when it is there already.
export const toggleItem = <T>(list: T[], item: T): T[] =>
    list.includes(item) ? list.filter((entry) => entry !== item) : [...list, item]

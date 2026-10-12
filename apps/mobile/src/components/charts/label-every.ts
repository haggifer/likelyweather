// Every chance-of-rain label gets about two characters' width; narrower slots show every n-th one.
export const getLabelEvery = (slotWidth: number, fontSize: number) => Math.max(1, Math.ceil((fontSize * 2) / slotWidth))

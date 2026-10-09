const listeners = new Set<() => void>()
let selected: string | null = null

// The city Home's overview shows, kept in memory for the session: Home's chips set it, and the City screen sets it to
// the city on screen, so going back lands on the city just viewed, like the web's "Back to overview" (`/?city=`).
// A cold start begins with the first chip again.
export const getSelectedCity = () => selected

export const setSelectedCity = (slug: string) => {
    if (slug === selected) return

    selected = slug
    listeners.forEach((listener) => listener())
}

export const subscribeSelectedCity = (onChange: () => void) => {
    listeners.add(onChange)

    return () => void listeners.delete(onChange)
}

import { useEffect } from 'react'

// The server titles a city page from its slug alone (on Lambda the web function cannot reach the API), so the title
// is English until the city record, which carries the names in every language, has loaded.
export function useDocumentTitle(title: string): void {
    useEffect(() => {
        document.title = title
    }, [title])
}

import { useEffect, useState } from 'react'
import { getPlacedWidgets, PlacedWidget } from '../widget/widget-updates'

// The launcher holds the list of placed widgets; it is read once when the screen opens.
export function usePlacedWidgets(): PlacedWidget[] {
    const [widgets, setWidgets] = useState<PlacedWidget[]>([])

    useEffect(() => {
        let isActive = true

        getPlacedWidgets()
            .then((placed) => {
                if (isActive) setWidgets(placed)
            })
            .catch((error) => console.warn(`Widget list failed: ${String(error)}`))

        return () => {
            isActive = false
        }
    }, [])

    return widgets
}

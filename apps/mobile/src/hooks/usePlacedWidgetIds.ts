import { useEffect, useState } from 'react'
import { getPlacedWidgetIds } from '../widget/widget-updates'

// The launcher holds the list of placed widgets; it is read once when the screen opens.
export function usePlacedWidgetIds(): number[] {
    const [widgetIds, setWidgetIds] = useState<number[]>([])

    useEffect(() => {
        let isActive = true

        getPlacedWidgetIds()
            .then((placed) => {
                if (isActive) setWidgetIds(placed)
            })
            .catch((error) => console.warn(`Widget list failed: ${String(error)}`))

        return () => {
            isActive = false
        }
    }, [])

    return widgetIds
}

interface IProps {
    message: string
}

// Over a chart or its table with no value to show. The frame stays under it, so its legend can still turn models back
// on and the controls around it still change the period.
export function NoDataOverlay({ message }: IProps) {
    return (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
            <p
                role="status"
                className="rounded-md bg-background/80 px-3 py-2 text-center text-sm text-muted-foreground"
            >
                {message}
            </p>
        </div>
    )
}

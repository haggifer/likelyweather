import { SHARE_COLORS, ShareLogo } from '@/lib/share-image'
import { ImageResponse } from 'next/og'

// The app icon's drawing: the logo's outline on white, for home screens, which cannot show the SVG favicon.
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
    return new ImageResponse(
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%',
                background: SHARE_COLORS.primaryForeground,
            }}
        >
            <ShareLogo size={128} />
        </div>,
        size,
    )
}

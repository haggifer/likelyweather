import { SHARE_IMAGE_SIZE } from '@/lib/page-metadata'
import { MODELS } from '@fa/shared/models'
import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

interface ShareImageOptions {
    title: string
    subtitle: string
    headers?: HeadersInit
}

// The light theme's --background, --foreground, --muted-foreground, --primary and --primary-foreground
// (apps/web/src/app/globals.css): Satori draws without the page's CSS.
export const SHARE_COLORS = {
    background: '#f7f9fc',
    foreground: '#0b1b33',
    muted: '#4a5a73',
    primary: '#1e5eff',
    primaryForeground: '#ffffff',
}

// lucide's cloud-sun, the logo's icon, on its 24-unit grid.
const LOGO_PATHS = [
    'M12 2v2',
    'm4.93 4.93 1.41 1.41',
    'M20 12h2',
    'm19.07 4.93-1.41 1.41',
    'M15.947 12.65a4 4 0 0 0-5.925-4.128',
    'M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z',
]

const PADDING = 72
const LINES_HEIGHT = 190
const LINE_STEPS = 48

// Read once per server process. The literal paths let Next.js trace the files into the standalone build.
const FONTS = Promise.all([
    readFile(join(process.cwd(), 'assets/fonts/Inter_400Regular.ttf')),
    readFile(join(process.cwd(), 'assets/fonts/Inter_600SemiBold.ttf')),
    readFile(join(process.cwd(), 'assets/fonts/Lexend_600SemiBold.ttf')),
])

// The models agree at first and fan out over the days, as forecasts do.
const getModelLinePath = (index: number) => {
    const offset = index - (MODELS.length - 1) / 2

    return Array.from({ length: LINE_STEPS + 1 }, (_, step) => {
        const progress = step / LINE_STEPS
        const x = progress * SHARE_IMAGE_SIZE.width
        const y = LINES_HEIGHT / 2 + 34 * Math.sin(progress * 7 + 0.6) + offset * (1.5 + 13 * progress ** 1.6)

        return `${step === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
    }).join(' ')
}

export const ShareLogo = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={SHARE_COLORS.primary} strokeWidth={1.75}>
        {LOGO_PATHS.map((d) => (
            <path key={d} d={d} strokeLinecap="round" strokeLinejoin="round" />
        ))}
    </svg>
)

export const getShareImage = async ({ title, subtitle, headers }: ShareImageOptions) => {
    const [interRegular, interSemiBold, lexendSemiBold] = await FONTS

    return new ImageResponse(
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                height: '100%',
                padding: PADDING,
                background: SHARE_COLORS.background,
                color: SHARE_COLORS.foreground,
                fontFamily: 'Inter',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <ShareLogo size={84} />
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        fontFamily: 'Lexend',
                        fontWeight: 600,
                        fontSize: 40,
                        lineHeight: 1.02,
                        letterSpacing: -0.8,
                    }}
                >
                    <span>likely</span>
                    <span>weather</span>
                </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 56, maxWidth: 1000 }}>
                <div style={{ fontSize: 64, fontWeight: 600, lineHeight: 1.1, letterSpacing: -1.5 }}>{title}</div>
                <div style={{ fontSize: 32, color: SHARE_COLORS.muted }}>{subtitle}</div>
            </div>
            <svg
                width={SHARE_IMAGE_SIZE.width}
                height={LINES_HEIGHT}
                viewBox={`0 0 ${SHARE_IMAGE_SIZE.width} ${LINES_HEIGHT}`}
                style={{ position: 'absolute', left: 0, bottom: 24 }}
            >
                {MODELS.map((model, index) => (
                    <path
                        key={model.id}
                        d={getModelLinePath(index)}
                        fill="none"
                        stroke={model.color}
                        strokeWidth={4}
                        strokeDasharray={model.dash}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                ))}
            </svg>
        </div>,
        {
            ...SHARE_IMAGE_SIZE,
            headers,
            fonts: [
                { name: 'Inter', data: interRegular, weight: 400, style: 'normal' },
                { name: 'Inter', data: interSemiBold, weight: 600, style: 'normal' },
                { name: 'Lexend', data: lexendSemiBold, weight: 600, style: 'normal' },
            ],
        },
    )
}

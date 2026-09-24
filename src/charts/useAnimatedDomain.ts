import { interpolateNumber } from 'd3-interpolate'
import { useEffect, useRef, useState } from 'react'

const DURATION_MS = 180

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

// Tweens a y-domain with D3 interpolators inside requestAnimationFrame; instant under reduced motion.
export default function useAnimatedDomain(target: [number, number]): [number, number] {
    const [domain, setDomain] = useState(target)
    const latest = useRef(domain)
    const [lo, hi] = target

    useEffect(() => {
        const from = latest.current
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

        if (reduced || (from[0] === lo && from[1] === hi)) {
            latest.current = [lo, hi]
            setDomain([lo, hi])
            return
        }

        const iLo = interpolateNumber(from[0], lo)
        const iHi = interpolateNumber(from[1], hi)
        const start = performance.now()
        let frame = 0

        const tick = (now: number) => {
            const t = easeOut(Math.min(1, (now - start) / DURATION_MS))
            const next: [number, number] = [iLo(t), iHi(t)]
            latest.current = next
            setDomain(next)

            if (t < 1) frame = requestAnimationFrame(tick)
        }

        frame = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(frame)
    }, [lo, hi])

    return domain
}

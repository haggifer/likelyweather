import { interpolateNumber } from 'd3-interpolate'
import { useEffect, useRef, useState } from 'react'

export type UseAnimatedDomainResult = [number, number]

interface AnimatedDomain {
    key: string
    domain: UseAnimatedDomainResult
}

const DURATION_MS = 180

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

// Tweens a y-domain with D3 interpolators inside requestAnimationFrame when the same series refreshes. A new
// `resetKey` (another variable, with other units) jumps straight to the target: tweening between unrelated scales
// shows nothing and re-renders the whole chart on every frame. Instant under reduced motion, which each app reads
// from its own platform.
export function useAnimatedDomain(
    target: UseAnimatedDomainResult,
    resetKey: string,
    isReducedMotion: boolean,
): UseAnimatedDomainResult {
    const [state, setState] = useState<AnimatedDomain>({ key: resetKey, domain: target })
    const latest = useRef(state)

    const [lo, hi] = target

    useEffect(() => {
        const from = latest.current
        const isSameTarget = from.key === resetKey && from.domain[0] === lo && from.domain[1] === hi

        const settle = (next: AnimatedDomain) => {
            latest.current = next
            setState(next)
        }

        if (isSameTarget) return

        if (isReducedMotion || from.key !== resetKey) {
            settle({ key: resetKey, domain: [lo, hi] })
            return
        }

        const iLo = interpolateNumber(from.domain[0], lo)
        const iHi = interpolateNumber(from.domain[1], hi)
        const start = performance.now()
        let frame = 0

        const tick = (now: number) => {
            const t = easeOut(Math.min(1, (now - start) / DURATION_MS))
            settle({ key: resetKey, domain: [iLo(t), iHi(t)] })

            if (t < 1) frame = requestAnimationFrame(tick)
        }

        frame = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(frame)
    }, [lo, hi, resetKey, isReducedMotion])

    return state.key === resetKey ? state.domain : target
}

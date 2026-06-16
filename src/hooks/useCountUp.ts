import { useEffect, useRef, useState } from 'react'

// Animate a number from its previous value to the target with an ease-out.
// Used for the big payoff readouts so results feel like a dial settling.
export function useCountUp(target: number, duration = 1100): number {
  const [value, setValue] = useState(target)
  const fromRef = useRef(target)
  const rafRef = useRef<number>()

  useEffect(() => {
    const from = fromRef.current
    const start = performance.now()
    const ease = (t: number) => 1 - Math.pow(1 - t, 3)

    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      setValue(from + (target - from) * ease(p))
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
      else fromRef.current = target
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      fromRef.current = target
    }
  }, [target, duration])

  return value
}

import { useEffect, useRef, useState } from "react";

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Animates a number from 0 to `target` using requestAnimationFrame.
 * Returns the current animated value. Resets when `target` changes.
 */
export function useCountUp(target: number, duration = 800): number {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const prevTargetRef = useRef(target);

  useEffect(() => {
    if (target !== prevTargetRef.current) {
      prevTargetRef.current = target;
      setCount(0);
    }
    if (target === 0) {
      setCount(0);
      return;
    }
    startRef.current = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      setCount(Math.round(easeOutCubic(progress) * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return count;
}

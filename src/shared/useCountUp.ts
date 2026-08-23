import { useEffect, useRef, useState } from "react";

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Animates a number from 0 to `target` using requestAnimationFrame.
 * Returns the current animated value. Resets when `target` changes.
 * Jumps straight to `target` when the user prefers reduced motion.
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
    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setCount(target);
      return;
    }
    startRef.current = performance.now();
    const isFloat = !Number.isInteger(target);
    const animate = (now: number) => {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const raw = easeOutCubic(progress) * target;
      setCount(isFloat ? Number(raw.toFixed(1)) : Math.round(raw));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return count;
}

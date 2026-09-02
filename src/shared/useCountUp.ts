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
  const [count, setCount] = useState(target === 0 ? 0 : 0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const fromRef = useRef(0);
  const countRef = useRef(count);
  countRef.current = count;

  useEffect(() => {
    if (target === 0) {
      setCount(0);
      fromRef.current = 0;
      return;
    }
    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setCount(target);
      fromRef.current = target;
      return;
    }
    const from = countRef.current;
    // if from equals target, no animation needed
    if (from === target) {
      setCount(target);
      fromRef.current = target;
      return;
    }
    startRef.current = performance.now();
    const isFloat = !Number.isInteger(target) || !Number.isInteger(from);
    const delta = target - from;
    const animate = (now: number) => {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const raw = from + easeOutCubic(progress) * delta;
      setCount(isFloat ? Number(raw.toFixed(1)) : Math.round(raw));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
      else fromRef.current = target;
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  // keep fromRef in sync when count settles
  useEffect(() => {
    if (count === target) fromRef.current = target;
  }, [count, target]);

  return count;
}

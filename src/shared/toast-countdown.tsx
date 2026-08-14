interface ToastCountdownProps {
  duration: number;
}

/**
 * CSS-only countdown bar showing how long the toast stays actionable.
 * `animationDuration` is set inline from the toast's own duration — no timers,
 * and the global reduced-motion override collapses the animation.
 */
export function ToastCountdown({ duration }: ToastCountdownProps) {
  return (
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-0.5 bg-foreground/5 motion-reduce:hidden"
      >
        <span
          data-testid="toast-countdown"
          className="block h-full bg-primary animate-toast-countdown"
          style={{ animationDuration: `${duration}ms` }}
        />
      </span>
  );
}
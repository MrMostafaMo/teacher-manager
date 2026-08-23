/**
 * Keep Tab cycling inside `container` — call from a capture-phase keydown
 * handler for popovers/dialogs so focus can never reach the page behind.
 */
export function cycleTabFocus(e: KeyboardEvent, container: HTMLElement | null): void {
  if (!container || e.key !== "Tab") return;
  const focusables = Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  );
  if (!focusables.length) return;
  e.preventDefault();
  const active = container.ownerDocument.activeElement as HTMLElement | null;
  const current = active ? focusables.indexOf(active) : -1;
  if (current === -1 || !container.contains(active)) {
    (e.shiftKey ? focusables[focusables.length - 1] : focusables[0]).focus();
    return;
  }
  const next = e.shiftKey
    ? (current - 1 + focusables.length) % focusables.length
    : (current + 1) % focusables.length;
  focusables[next].focus();
}

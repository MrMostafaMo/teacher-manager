/**
 * Unwrap an error (and its `cause` chain, e.g. driver errors that hide the
 * real SQLite failure behind a "Failed query: ..." message) into one line.
 */
export function getErrorMessage(error: unknown): string {
  const parts: string[] = [];
  const seen = new Set<unknown>();
  let current = error;
  while (current !== null && current !== undefined && !seen.has(current)) {
    seen.add(current);
    if (current instanceof Error) {
      if (current.message) parts.push(current.message);
      current = (current as { cause?: unknown }).cause;
    } else {
      parts.push(String(current));
      break;
    }
  }
  return parts.join(" — ") || String(error);
}

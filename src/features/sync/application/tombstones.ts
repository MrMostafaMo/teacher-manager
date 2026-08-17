/**
 * Single source of truth for delete-vs-live-row resolution.
 *
 * A tombstone beats a live row only when its `deletedAt` is strictly newer
 * than the row's `updatedAt`; otherwise the row wins (it was edited after the
 * delete — e.g. by undo/restore or by another device). Equal timestamps keep
 * the live row, so an undo that restores verbatim timestamps survives.
 */
export function tombstoneBeatsRow(deletedAt: number, rowUpdatedAt: number): boolean {
  return deletedAt > rowUpdatedAt;
}

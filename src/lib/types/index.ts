/** Shared cross-feature domain types. */

export type UUID = string;

/** Base shape every persisted entity implements. */
export interface Entity {
  id: UUID;
  createdAt: number;
  updatedAt: number;
}

/**
 * Sync provider abstraction — one contract for every remote backend.
 * Each provider owns its own file/revision; the orchestrator runs them in sequence.
 */
export type SyncProviderId = "supabase";

export interface SyncDownload {
  text: string;
  etag: string | null;
}

export interface SyncProvider {
  readonly id: SyncProviderId;
  isConfigured(): Promise<boolean>;
  download(): Promise<SyncDownload | null>;
  upload(text: string, etag: string | null): Promise<void>;
  uploadBytes(fileName: string, bytes: Uint8Array, folderName: string): Promise<void>;
  listFiles(folderName: string): Promise<Array<{ id: string; name: string }>>;
  downloadBytes(fileId: string): Promise<Uint8Array>;
}

/**
 * Google Drive files API client (the app's own `drive.file` scope folder).
 * Uploads use If-Match optimistic locking so two devices can't silently
 * overwrite each other's pushes.
 */

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const APP_FOLDER = "TeacherManager";

import {
  DriveError,
  bearerFetch,
  driveJson,
  multipart,
  queryFiles,
  type DriveClientDeps,
  type DriveFileRef,
} from "./drive-http";

export { DriveError, type DriveClientDeps, type DriveFileRef };

export class DriveClient {
  private folderId: string | null = null;

  constructor(private readonly deps: DriveClientDeps) {}

  /** Download a text file by name from the app folder; null when absent. */
  async download(name: string): Promise<{ text: string; etag: string | null } | null> {
    const file = await this.findFile(name);
    if (file === null) return null;
    const response = await bearerFetch(
      this.deps,
      `${DRIVE_API}/files/${file.id}?alt=media`,
      { method: "GET" },
      true,
    );
    return { text: await response.text(), etag: file.etag };
  }

  /** Upload text into the app folder. With etag, fails on concurrent change. */
  async upload(name: string, text: string, etag: string | null): Promise<void> {
    const file = await this.findFile(name);
    const metadata = { name, parents: [await this.folder()] };
    if (file === null) {
      await bearerFetch(this.deps, `${UPLOAD_API}/files?uploadType=multipart&fields=id`, {
        method: "POST",
        body: multipart(metadata, text),
      });
      return;
    }
    const headers: Record<string, string> = {};
    if (etag !== null) headers["If-Match"] = etag;
    const response = await bearerFetch(
      this.deps,
      `${UPLOAD_API}/files/${file.id}?uploadType=multipart&fields=id`,
      { method: "PATCH", headers, body: multipart({ name }, text) },
    );
    if (response.status === 412) throw new DriveError("conflict", "file changed remotely");
  }

  /** Upload arbitrary bytes (a backup .db file) into the backups subfolder. */
  async uploadBytes(fileName: string, bytes: Uint8Array, folderName: string): Promise<void> {
    const folder = await this.folderByName(folderName);
    const response = await bearerFetch(
      this.deps,
      `${UPLOAD_API}/files?uploadType=media&fields=id`,
      {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: new Blob([bytes as BlobPart]),
      },
    );
    const json = (await response.json()) as { id?: string };
    if (json.id !== undefined) {
      await driveJson(this.deps, `${DRIVE_API}/files/${json.id}`, "PATCH", {
        name: fileName,
        parents: [folder.id],
      });
    }
  }

  /** Files in a subfolder, newest first (backup listing for restore). */
  async listFiles(folderName: string): Promise<Array<{ id: string; name: string }>> {
    const folder = await this.folderByName(folderName);
    return (await queryFiles(
      this.deps,
      `'${folder.id}' in parents and trashed=false`,
      "files(id,name)",
    )) as Array<{ id: string; name: string }>;
  }

  async downloadBytes(fileId: string): Promise<Uint8Array> {
    const response = await bearerFetch(
      this.deps,
      `${DRIVE_API}/files/${fileId}?alt=media`,
      { method: "GET" },
      true,
    );
    return new Uint8Array(await response.arrayBuffer());
  }

  private async findFile(name: string): Promise<DriveFileRef | null> {
    const folder = await this.folder();
    const rows = await queryFiles(
      this.deps,
      `'${folder}' in parents and name='${name}' and trashed=false`,
      "files(id,etag)",
    );
    const file = rows[0] as { id?: string; etag?: string } | undefined;
    return file === undefined ? null : { id: file.id ?? "", etag: file.etag ?? null };
  }

  private async folder(): Promise<string> {
    if (this.folderId !== null) return this.folderId;
    const folder = await this.folderByName(APP_FOLDER);
    this.folderId = folder.id;
    return folder.id;
  }

  private async folderByName(name: string): Promise<{ id: string }> {
    const rows = await queryFiles(
      this.deps,
      `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      "files(id)",
    );
    const existing = rows[0] as { id?: string } | undefined;
    if (existing !== undefined) return { id: existing.id ?? "" };
    const created = await driveJson(this.deps, `${DRIVE_API}/files?fields=id`, "POST", {
      name,
      mimeType: "application/vnd.google-apps.folder",
    });
    const id = (created.id as string | undefined) ?? "";
    if (!id) throw new DriveError("other", "folder create failed");
    return { id };
  }
}

/**
 * Raw Drive HTTP plumbing: typed errors, bearer fetch with one
 * refresh-and-retry cycle on 401, and the multipart payload builder.
 * Kept apart from `drive-client` so the client stays within the line cap.
 */

const DRIVE_API = "https://www.googleapis.com/drive/v3";

export type DriveErrorKind = "unauthorized" | "conflict" | "notFound" | "network" | "other";

export class DriveError extends Error {
  kind: DriveErrorKind;
  constructor(kind: DriveErrorKind, message: string) {
    super(message);
    this.kind = kind;
  }
}

export interface DriveFileRef {
  id: string;
  etag: string | null;
}

export interface DriveClientDeps {
  /** Current access token; null when signed out. */
  getToken: () => Promise<string | null>;
  /** Exchange the refresh token for a new access token; null on failure. */
  refresh: () => Promise<string | null>;
  fetchImpl?: typeof fetch;
}

/** Bearer fetch with one refresh-and-retry cycle on 401. */
export async function bearerFetch(
  deps: DriveClientDeps,
  url: string,
  init: RequestInit,
  allowNotFound = false,
): Promise<Response> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const token = await deps.getToken();
  if (token === null) throw new DriveError("unauthorized", "no token");
  const withAuth = (accessToken: string) => ({
    ...init,
    headers: { ...(init.headers ?? {}), Authorization: `Bearer ${accessToken}` },
  });
  let response = await fetchImpl(url, withAuth(token));
  if (response.status === 401) {
    const fresh = await deps.refresh();
    if (fresh === null) throw new DriveError("unauthorized", "refresh failed");
    response = await fetchImpl(url, withAuth(fresh));
  }
  if (response.status === 404 && allowNotFound) return response;
  if (!response.ok) {
    const kind: DriveErrorKind =
      response.status === 404
        ? "notFound"
        : response.status === 412
          ? "conflict"
          : response.status >= 500
            ? "network"
            : "other";
    throw new DriveError(kind, `drive ${response.status}`);
  }
  return response;
}

/** Multipart body for metadata + text uploads (uploadType=multipart). */
export function multipart(metadata: object, text: string): FormData {
  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" }),
  );
  form.append("file", new Blob([text], { type: "application/json" }));
  return form;
}

/** Query the Drive API with a prebuilt `q` clause, returning file rows. */
export async function queryFiles(
  deps: DriveClientDeps,
  query: string,
  fields: string,
): Promise<Array<Record<string, unknown>>> {
  const response = await bearerFetch(
    deps,
    `${DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}`,
    { method: "GET" },
  );
  const json = (await response.json()) as { files?: Array<Record<string, unknown>> };
  return json.files ?? [];
}

/** JSON POST/PATCH helper (folder creation, parent reassignment). */
export async function driveJson(
  deps: DriveClientDeps,
  url: string,
  method: "POST" | "PATCH",
  body: object,
): Promise<Record<string, unknown>> {
  const response = await bearerFetch(deps, url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await response.json()) as Record<string, unknown>;
}
/**
 * Google credential lifecycle: sign-in/out and the token session that a
 * DriveClient uses (fresh access token with refresh persistence).
 */

import { signInWithGoogle } from "./oauth-cases";
import { DriveError } from "../infrastructure/drive-client";
import { refreshAccessToken } from "../infrastructure/oauth-client";
import {
  SYNC_META_KEYS,
  clearAccountMeta,
  getSyncMeta,
  setSyncMeta,
} from "../infrastructure/sync-state-repo";

export interface SyncDeps {
  getToken: () => Promise<string | null>;
  refresh: () => Promise<string | null>;
  fetchImpl?: typeof fetch;
}

export async function isConnected(): Promise<boolean> {
  const [clientId, refreshToken] = await Promise.all([
    getSyncMeta(SYNC_META_KEYS.clientId),
    getSyncMeta(SYNC_META_KEYS.refreshToken),
  ]);
  return clientId !== null && refreshToken !== null;
}

/** Full sign-in: PKCE flow, persist credentials, then an initial sync. */
export async function connectAccount(clientId: string): Promise<string> {
  const { tokens, email } = await signInWithGoogle(clientId);
  await setSyncMeta(SYNC_META_KEYS.clientId, clientId);
  await setSyncMeta(SYNC_META_KEYS.accessToken, tokens.accessToken);
  if (tokens.refreshToken !== undefined) {
    await setSyncMeta(SYNC_META_KEYS.refreshToken, tokens.refreshToken);
  }
  await setSyncMeta(SYNC_META_KEYS.tokenExpiresAt, Date.now() + tokens.expiresIn * 1000);
  await setSyncMeta(SYNC_META_KEYS.accountEmail, email);
  return email;
}

export async function disconnectAccount(): Promise<void> {
  await clearAccountMeta();
}

/** The Google session for a DriveClient: token fetch + refresh persistence. */
export async function buildDriveSession(
  fetchImpl: typeof fetch = fetch,
): Promise<SyncDeps> {
  const clientId = await getSyncMeta(SYNC_META_KEYS.clientId);
  const refreshToken = await getSyncMeta(SYNC_META_KEYS.refreshToken);
  if (clientId === null || refreshToken === null) {
    throw new DriveError("unauthorized", "not connected");
  }
  const client = clientId;
  const refreshTok = refreshToken;
  let cachedToken = await getSyncMeta(SYNC_META_KEYS.accessToken);
  let cachedExpiry = Number(await getSyncMeta(SYNC_META_KEYS.tokenExpiresAt));

  async function refresh(): Promise<string | null> {
    const tokens = await refreshAccessToken(fetchImpl, client, refreshTok);
    const fresh = tokens.accessToken ?? null;
    if (fresh === null) throw new DriveError("unauthorized", "refresh returned no token");
    cachedToken = fresh;
    cachedExpiry = Date.now() + tokens.expiresIn * 1000;
    await setSyncMeta(SYNC_META_KEYS.accessToken, fresh);
    await setSyncMeta(SYNC_META_KEYS.tokenExpiresAt, cachedExpiry);
    return fresh;
  }

  return {
    getToken: async () => {
      if (cachedToken !== null && cachedExpiry > Date.now() + 60_000) return cachedToken;
      return refresh();
    },
    refresh,
  };
}
/**
 * Google OAuth token endpoints (PKCE for desktop apps). Plain fetch — Google
 * APIs send CORS headers, so no HTTP plugin is needed. All calls are pure
 * functions over `fetch` so tests can mock the network.
 */

export const REDIRECT_URI = "http://127.0.0.1:45467/oauth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";

export interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  idToken?: string;
}

export async function exchangeCode(
  fetchImpl: typeof fetch,
  clientId: string,
  code: string,
  verifier: string,
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    code,
    code_verifier: verifier,
    redirect_uri: REDIRECT_URI,
  });
  const json = await postForm(fetchImpl, body);
  return {
    accessToken: String(json.access_token ?? ""),
    refreshToken: json.refresh_token === undefined ? undefined : String(json.refresh_token),
    expiresIn: Number(json.expires_in ?? 3600),
    idToken: json.id_token === undefined ? undefined : String(json.id_token),
  };
}

export async function refreshAccessToken(
  fetchImpl: typeof fetch,
  clientId: string,
  refreshToken: string,
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    refresh_token: refreshToken,
  });
  const json = await postForm(fetchImpl, body);
  return {
    accessToken: String(json.access_token ?? ""),
    expiresIn: Number(json.expires_in ?? 3600),
  };
}

export async function fetchAccountEmail(
  fetchImpl: typeof fetch,
  accessToken: string,
): Promise<string> {
  const response = await fetchImpl(USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error(`userinfo failed: ${response.status}`);
  const json = (await response.json()) as { email?: string };
  const email = json.email ?? "";
  if (!email) throw new Error("userinfo missing email");
  return email;
}

async function postForm(
  fetchImpl: typeof fetch,
  body: URLSearchParams,
): Promise<Record<string, unknown>> {
  const response = await fetchImpl(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(`token endpoint failed: ${response.status} ${JSON.stringify(json)}`);
  }
  return json;
}

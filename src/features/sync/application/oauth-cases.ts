import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  exchangeCode,
  fetchAccountEmail,
  REDIRECT_URI,
  type TokenResponse,
} from "../infrastructure/oauth-client";

/**
 * PKCE sign-in flow. Pure helpers (verifier/challenge/state/URL parsing) are
 * unit-testable; `signInWithGoogle` drives the native window + event glue.
 */

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
const OAUTH_TIMEOUT_MS = 3 * 60 * 1000;

export class OAuthCancelError extends Error {
  constructor() {
    super("oauth cancelled");
  }
}

function randomString(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const byte of bytes) out += CODE_CHARS[byte % CODE_CHARS.length];
  return out;
}

/** 64-char PKCE verifier (RFC 7636: 43–128 chars, unreserved charset). */
export function generateVerifier(): string {
  return randomString(64);
}

/** Random state token bound to this flow instance. */
export function generateState(): string {
  return randomString(24);
}

export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** S256 PKCE challenge for a verifier (WebCrypto — available in WebKitGTK). */
export async function generateChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64UrlEncode(new Uint8Array(digest));
}

/** Google consent URL for a desktop-app (loopback) client. */
export function buildAuthUrl(
  clientId: string,
  challenge: string,
  state: string,
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "openid email drive.file",
    code_challenge: challenge,
    code_challenge_method: "S256",
    state,
    access_type: "offline",
    prompt: "consent",
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

export interface CallbackPayload {
  code: string;
  state: string;
}

/** Validate an intercepted redirect URL; throws when state or code is missing. */
export function parseCallbackUrl(rawUrl: string): CallbackPayload {
  const url = new URL(rawUrl);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (code === null || state === null) throw new Error("oauth callback missing params");
  return { code, state };
}

/** Full sign-in: consent page in the system browser, wait for the redirect. */
export async function signInWithGoogle(
  clientId: string,
  fetchImpl: typeof fetch = fetch,
  openUrlImpl: (url: string) => Promise<void> = openUrl,
  timeoutMs: number = OAUTH_TIMEOUT_MS,
): Promise<{ tokens: TokenResponse; email: string }> {
  const verifier = generateVerifier();
  const state = generateState();
  const challenge = await generateChallenge(verifier);
  const authUrl = buildAuthUrl(clientId, challenge, state);

  await invoke("start_oauth_server");
  await openUrlImpl(authUrl);
  const rawUrl = await waitForCallback(state, timeoutMs);
  const { code } = parseCallbackUrl(rawUrl);
  const tokens = await exchangeCode(fetchImpl, clientId, code, verifier);
  const email = await fetchAccountEmail(fetchImpl, tokens.accessToken);
  return { tokens, email };
}

async function openUrl(url: string): Promise<void> {
  const { openUrl: opener } = await import("@tauri-apps/plugin-opener");
  await opener(url);
}

function waitForCallback(expectedState: string, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      void unlisten();
      reject(new OAuthCancelError());
    }, timeoutMs);
    let unlisten = () => {};
    void listen<string>("oauth:callback", (event) => {
      const payload = parseCallbackUrl(event.payload);
      if (payload.state !== expectedState) return;
      window.clearTimeout(timer);
      void unlisten();
      resolve(event.payload);
    }).then((fn) => {
      unlisten = fn;
    });
  });
}
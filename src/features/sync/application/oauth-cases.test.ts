import { beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.hoisted(() => vi.fn(async () => undefined));
const listen = vi.hoisted(() =>
  vi.fn(async (_event: string, _handler: (e: { payload: string }) => void) => () => {}),
);

vi.mock("@tauri-apps/api/core", () => ({ invoke }));
vi.mock("@tauri-apps/api/event", () => ({ listen }));

import {
  OAuthCancelError,
  base64UrlEncode,
  buildAuthUrl,
  generateChallenge,
  generateState,
  generateVerifier,
  parseCallbackUrl,
  signInWithGoogle,
} from "./oauth-cases";
import { REDIRECT_URI } from "../infrastructure/oauth-client";

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 500,
    json: async () => body,
  } as unknown as Response;
}

const CALLBACK_URL = "http://127.0.0.1:45467/oauth?code=code-1&state=";

beforeEach(() => {
  invoke.mockClear();
  listen.mockClear();
});

describe("oauth-cases helpers", () => {
  it("generates a 64-char verifier from the unreserved charset", () => {
    const verifier = generateVerifier();
    expect(verifier).toHaveLength(64);
    expect(verifier).toMatch(/^[A-Za-z0-9\-._~]+$/);
    expect(generateVerifier()).not.toBe(verifier);
  });

  it("generates a state token", () => {
    expect(generateState()).toHaveLength(24);
  });

  it("base64url-encodes without padding", () => {
    expect(base64UrlEncode(new Uint8Array([0xfb, 0xff, 0xfe]))).toBe("-__-");
    expect(base64UrlEncode(new Uint8Array([0x61]))).toBe("YQ");
  });

  it("derives a valid S256 challenge", async () => {
    const challenge = await generateChallenge("verifier-1234567890");
    expect(challenge).toMatch(/^[A-Za-z0-9\-_]+$/);
    expect(challenge).not.toContain("=");
  });

  it("builds a consent URL with all PKCE params", () => {
    const url = new URL(buildAuthUrl("client-1", "challenge", "state-1"));
    expect(url.searchParams.get("client_id")).toBe("client-1");
    expect(url.searchParams.get("redirect_uri")).toBe(REDIRECT_URI);
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("code_challenge")).toBe("challenge");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("state")).toBe("state-1");
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("scope")).toContain("drive.file");
  });

  it("parses a callback URL with code + state", () => {
    const payload = parseCallbackUrl("http://127.0.0.1:45467/oauth?code=abc&state=xyz&scope=email");
    expect(payload).toEqual({ code: "abc", state: "xyz" });
  });

  it("rejects a callback missing the code", () => {
    expect(() => parseCallbackUrl("http://127.0.0.1:45467/oauth?state=xyz")).toThrow();
  });
});

describe("signInWithGoogle", () => {
  type Callback = (event: { payload: string }) => void;

  it("starts the local server, opens the browser and exchanges the code", async () => {
    const captured: { handler: Callback | null } = { handler: null };
    listen.mockImplementation(async (event: string, handler: Callback) => {
      if (event === "oauth:callback") captured.handler = handler;
      return () => {};
    });
    const openUrl = vi.fn(async (_url: string) => undefined);
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
      const u = String(url);
      if (u.includes("oauth2.googleapis.com/token")) {
        return jsonResponse({ access_token: "at-1", refresh_token: "rt-1", expires_in: 3600 });
      }
      return jsonResponse({ email: "teacher@example.com" });
    });

    const promise = signInWithGoogle("client-1", fetchImpl, openUrl);
    await vi.waitFor(() => expect(captured.handler).not.toBeNull());
    expect(invoke).toHaveBeenCalledWith("start_oauth_server");
    expect(openUrl).toHaveBeenCalledTimes(1);
    const authUrl = String(openUrl.mock.calls[0][0]);
    expect(new URL(authUrl).searchParams.get("redirect_uri")).toBe(REDIRECT_URI);

    const state = new URL(authUrl).searchParams.get("state");
    await captured.handler?.({ payload: `${CALLBACK_URL}${state}` });

    const result = await promise;
    expect(result.tokens.accessToken).toBe("at-1");
    expect(result.email).toBe("teacher@example.com");
  });

  it("rejects with OAuthCancelError when the redirect never arrives", async () => {
    listen.mockImplementation(async () => () => {});
    const openUrl = vi.fn(async () => undefined);
    const fetchImpl = vi.fn(async () => jsonResponse({}));

    const promise = signInWithGoogle("client-1", fetchImpl, openUrl, 25);
    promise.catch(() => {});
    await vi.waitFor(() => expect(listen).toHaveBeenCalled());
    await expect(promise).rejects.toBeInstanceOf(OAuthCancelError);
  });
});

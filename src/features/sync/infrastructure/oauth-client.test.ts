import { describe, expect, it, vi } from "vitest";
import { exchangeCode, fetchAccountEmail, refreshAccessToken } from "./oauth-client";

function okResponse(json: unknown): Response {
  return new Response(JSON.stringify(json), { status: 200 });
}

describe("oauth-client", () => {
  it("exchanges a code for tokens", async () => {
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, _init: RequestInit | undefined) =>
      okResponse({ access_token: "at", refresh_token: "rt", expires_in: 3600 }),
    );
    const result = await exchangeCode(fetchImpl, "client", "code", "verifier");
    expect(result).toEqual({
      accessToken: "at",
      refreshToken: "rt",
      expiresIn: 3600,
      idToken: undefined,
    });
    const call = fetchImpl.mock.calls[0];
    expect(call).toBeDefined();
    const body = call[1]?.body as URLSearchParams;
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("code_verifier")).toBe("verifier");
    expect(body.get("redirect_uri")).toContain("127.0.0.1");
  });

  it("refreshes an access token", async () => {
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, _init: RequestInit | undefined) => okResponse({ access_token: "at2", expires_in: 60 }));
    const result = await refreshAccessToken(fetchImpl, "client", "rt");
    expect(result.accessToken).toBe("at2");
    expect(result.refreshToken).toBeUndefined();
  });

  it("throws when the token endpoint errors", async () => {
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, _init: RequestInit | undefined) =>
      new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 }),
    );
    await expect(refreshAccessToken(fetchImpl, "client", "rt")).rejects.toThrow("400");
  });

  it("fetches the account email", async () => {
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, _init: RequestInit | undefined) => okResponse({ email: "me@example.com" }));
    expect(await fetchAccountEmail(fetchImpl, "at")).toBe("me@example.com");
    const headers = fetchImpl.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer at");
  });

  it("throws when userinfo has no email", async () => {
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, _init: RequestInit | undefined) => okResponse({}));
    await expect(fetchAccountEmail(fetchImpl, "at")).rejects.toThrow("missing email");
  });
});
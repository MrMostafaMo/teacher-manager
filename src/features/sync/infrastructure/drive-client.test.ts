import { beforeEach, describe, expect, it, vi } from "vitest";
import { DriveClient } from "./drive-client";
import { DriveError, bearerFetch, multipart } from "./drive-http";
import type { DriveClientDeps } from "./drive-http";

const fetchImpl = vi.fn(async (_url: RequestInfo | URL, _init: RequestInit | undefined) => {
  return new Response("{}", { status: 200 });
});

function deps(overrides: Partial<DriveClientDeps> = {}): DriveClientDeps {
  return {
    getToken: vi.fn(async () => "tok"),
    refresh: vi.fn(async () => "tok2"),
    fetchImpl,
    ...overrides,
  };
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status });
}

beforeEach(() => {
  fetchImpl.mockReset();
  fetchImpl.mockImplementation(async (_url: RequestInfo | URL, _init: RequestInit | undefined) => {
    return new Response("{}", { status: 200 });
  });
});

describe("drive-http", () => {
  it("throws unauthorized when there is no token", async () => {
    await expect(
      bearerFetch(deps({ getToken: vi.fn(async () => null) }), "https://x", { method: "GET" }),
    ).rejects.toThrowError(DriveError);
  });

  it("refreshes once on 401 and retries", async () => {
    fetchImpl.mockReset();
    fetchImpl
      .mockResolvedValueOnce(jsonResponse(401, {}))
      .mockResolvedValueOnce(jsonResponse(200, {}));
    const response = await bearerFetch(deps(), "https://x", { method: "GET" });
    expect(response.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("maps 412 to conflict and 5xx to network", async () => {
    fetchImpl.mockReset();
    fetchImpl.mockResolvedValueOnce(jsonResponse(412, {}));
    await expect(bearerFetch(deps(), "https://x", { method: "GET" })).rejects.toMatchObject({
      kind: "conflict",
    });
    fetchImpl.mockReset();
    fetchImpl.mockResolvedValueOnce(jsonResponse(503, {}));
    await expect(bearerFetch(deps(), "https://x", { method: "GET" })).rejects.toMatchObject({
      kind: "network",
    });
  });

  it("builds a multipart body with metadata + file parts", () => {
    const form = multipart({ name: "a" }, "text");
    expect(form.get("metadata")).not.toBeNull();
    expect(form.get("file")).not.toBeNull();
  });
});

describe("DriveClient", () => {
  it("downloads a file and returns its etag", async () => {
    fetchImpl.mockReset();
    fetchImpl.mockImplementation(async (url: RequestInfo | URL) => {
      const u = String(url);
      if (u.includes("files?")) return jsonResponse(200, { files: [{ id: "f1", etag: "e1" }] });
      return new Response("payload", { status: 200 });
    });
    const client = new DriveClient(deps());
    const result = await client.download("sync-data.json");
    expect(result).toEqual({ text: "payload", etag: "e1" });
  });

  it("returns null when the file does not exist", async () => {
    fetchImpl.mockImplementation(async (_url: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") return jsonResponse(200, { id: "folder" });
      return jsonResponse(200, { files: [] });
    });
    const client = new DriveClient(deps());
    expect(await client.download("sync-data.json")).toBeNull();
  });

  it("throws conflict when upload hits a 412", async () => {
    fetchImpl.mockReset();
    fetchImpl.mockImplementation(async (url: RequestInfo | URL, _init?: RequestInit) => {
      const u = String(url);
      if (u.includes("files?")) return jsonResponse(200, { files: [{ id: "f1", etag: "e1" }] });
      return jsonResponse(412, {});
    });
    const client = new DriveClient(deps());
    await expect(client.upload("sync-data.json", "{}", "e1")).rejects.toMatchObject({
      kind: "conflict",
    });
  });

  it("uploads bytes with the media endpoint and moves the file into the folder", async () => {
    fetchImpl.mockReset();
    fetchImpl.mockImplementation(async (url: RequestInfo | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.includes("files?") && init?.method === "GET") {
        return jsonResponse(200, { files: [] });
      }
      if (init?.method === "POST") return jsonResponse(200, { id: "folder" });
      return jsonResponse(200, {});
    });
    const client = new DriveClient(deps());
    await client.uploadBytes("backup.db", new Uint8Array([1, 2, 3]), "backups");
    const patch = fetchImpl.mock.calls.find((call) => call[1]?.method === "PATCH")?.[1] as
      RequestInit | undefined;
    const body = patch?.body as string;
    expect(JSON.parse(body)).toEqual({ name: "backup.db", parents: ["folder"] });
  });

  it("lists backup files newest first", async () => {
    fetchImpl.mockImplementation(async () =>
      jsonResponse(200, {
        files: [
          { id: "f2", name: "b2" },
          { id: "f1", name: "b1" },
        ],
      }),
    );
    const client = new DriveClient(deps());
    const files = await client.listFiles("backups");
    expect(files.map((f) => f.name)).toEqual(["b2", "b1"]);
  });
});

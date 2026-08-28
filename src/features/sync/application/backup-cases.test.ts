import { beforeEach, describe, expect, it, vi } from "vitest";

const remove = vi.hoisted(() => vi.fn(async () => undefined));
const readFile = vi.hoisted(() => vi.fn());
const writeFile = vi.hoisted(() => vi.fn(async () => undefined));
const backupDatabase = vi.hoisted(() => vi.fn(async () => undefined));
const swapDatabaseFrom = vi.hoisted(() => vi.fn());
const uploadBytes = vi.hoisted(() => vi.fn(async () => undefined));
const listFiles = vi.hoisted(() => vi.fn());
const downloadBytes = vi.hoisted(() => vi.fn());

vi.mock("@tauri-apps/api/path", () => ({
  appConfigDir: vi.fn(async () => "/cfg"),
  join: vi.fn(async (...parts: string[]) => parts.join("/")),
}));
vi.mock("@tauri-apps/plugin-fs", () => ({ remove, readFile, writeFile }));
vi.mock("@/lib/utils/uuid", () => ({ uuid: vi.fn(() => "uuid-1") }));
vi.mock("@/features/settings/infrastructure/backup-service", () => ({
  backupDatabase,
  swapDatabaseFrom,
}));
vi.mock("../infrastructure/supabase-provider", () => ({
  SupabaseProvider: class {
    id = "supabase" as const;
    isConfigured = vi.fn(async () => true);
    uploadBytes = uploadBytes;
    listFiles = listFiles;
    downloadBytes = downloadBytes;
    download = vi.fn(async () => null);
    upload = vi.fn(async () => undefined);
  },
}));

import { cloudBackupDatabase, cloudRestoreDatabase } from "./backup-cases";

beforeEach(() => {
  remove.mockClear();
  readFile.mockClear();
  writeFile.mockClear();
  backupDatabase.mockClear();
  swapDatabaseFrom.mockClear();
  uploadBytes.mockClear();
  listFiles.mockClear();
  downloadBytes.mockClear();
});

describe("backup-cases", () => {
  it("uploads a VACUUM snapshot and cleans up the temp file", async () => {
    readFile.mockResolvedValue(new Uint8Array([1, 2, 3]));
    const result = await cloudBackupDatabase("device-ab12");
    expect(result).toEqual({ status: "ok" });
    expect(backupDatabase).toHaveBeenCalledWith(expect.stringContaining("backup-device-ab12-"));
    expect(uploadBytes).toHaveBeenCalledWith(expect.stringContaining("backup-device-ab12-"), new Uint8Array([1, 2, 3]), "backups");
    expect(remove).toHaveBeenCalledTimes(1);
  });
  it("reports an error when the snapshot upload fails", async () => {
    uploadBytes.mockRejectedValueOnce(new Error("boom"));
    const result = await cloudBackupDatabase("device-ab12");
    expect(result.status).toBe("error");
    expect(remove).toHaveBeenCalledTimes(1);
  });
  it("restores the newest backup through the shared swap flow", async () => {
    listFiles.mockResolvedValue([{ id: "f2", name: "b2" }, { id: "f1", name: "b1" }]);
    downloadBytes.mockResolvedValue(new Uint8Array([9]));
    swapDatabaseFrom.mockResolvedValue({ status: "done" });
    const confirm = vi.fn(async () => true);
    const result = await cloudRestoreDatabase(confirm);
    expect(result).toEqual({ status: "done" });
    expect(downloadBytes).toHaveBeenCalledWith("f2");
    expect(writeFile).toHaveBeenCalledWith("/cfg/restore-uuid-1.db", new Uint8Array([9]));
    expect(swapDatabaseFrom).toHaveBeenCalledWith("/cfg/restore-uuid-1.db", confirm);
    expect(remove).toHaveBeenCalledTimes(1);
  });
  it("reports notFound when no backups exist", async () => {
    listFiles.mockResolvedValue([]);
    expect(await cloudRestoreDatabase(async () => true)).toEqual({ status: "notFound" });
    expect(remove).not.toHaveBeenCalled();
  });
});

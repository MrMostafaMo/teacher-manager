import { describe, expect, it } from "vitest";
import { tombstoneBeatsRow } from "./tombstones";

describe("tombstoneBeatsRow", () => {
  it("beats a row deleted earlier than the row's edit", () => {
    expect(tombstoneBeatsRow(2000, 1000)).toBe(true);
  });

  it("loses to a row edited after the delete (undo / other device)", () => {
    expect(tombstoneBeatsRow(1000, 2000)).toBe(false);
  });

  it("keeps the live row on equal timestamps", () => {
    expect(tombstoneBeatsRow(1500, 1500)).toBe(false);
  });
});
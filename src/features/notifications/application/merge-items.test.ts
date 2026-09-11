import { describe, expect, it } from "vitest";
import type { NotificationItem } from "@/features/notifications/domain";
import { mergeItems } from "./merge-items";

function item(key: string, type: NotificationItem["type"] = "weak_skill"): NotificationItem {
  return { type, key, details: {} };
}

describe("mergeItems", () => {
  it("inserts desired keys not yet stored", () => {
    const { toInsert, toRemove } = mergeItems(
      [{ id: "a", key: "weak:k1" }],
      [item("weak:k1"), item("homework:h1", "homework_overdue")],
    );
    expect(toInsert.map((i) => i.key)).toEqual(["homework:h1"]);
    expect(toRemove).toEqual([]);
  });

  it("removes stored keys no longer desired", () => {
    const { toInsert, toRemove } = mergeItems(
      [
        { id: "a", key: "weak:k1" },
        { id: "b", key: "weak:k2" },
      ],
      [item("weak:k1")],
    );
    expect(toInsert).toEqual([]);
    expect(toRemove).toEqual(["b"]);
  });

  it("keeps existing rows untouched when keys match", () => {
    const existing = [
      { id: "a", key: "weak:k1" },
      { id: "b", key: "weak:k2" },
    ];
    const { toInsert, toRemove } = mergeItems(existing, [item("weak:k2"), item("weak:k1")]);
    expect(toInsert).toEqual([]);
    expect(toRemove).toEqual([]);
  });

  it("handles empty input sets", () => {
    expect(mergeItems([], [])).toEqual({ toInsert: [], toRemove: [], toUpdate: [] });
    expect(mergeItems([{ id: "a", key: "weak:k1" }], []).toRemove).toEqual(["a"]);
  });

  it("refreshes stale details in place", () => {
    const { toInsert, toRemove, toUpdate } = mergeItems(
      [{ id: "a", key: "weak:k1", details: JSON.stringify({ count: 1 }) }],
      [{ type: "weak_skill", key: "weak:k1", details: { count: 2 } }],
    );
    expect(toInsert).toEqual([]);
    expect(toRemove).toEqual([]);
    expect(toUpdate).toEqual([{ id: "a", details: { count: 2 } }]);
  });
});

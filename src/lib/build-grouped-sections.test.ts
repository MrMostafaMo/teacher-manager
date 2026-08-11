import { describe, expect, it } from "vitest";
import { buildSectionsByGroup } from "@/lib/build-grouped-sections";

const groupsOf = (row: { id: string; groups: string[] }) =>
  row.groups.map((g) => {
    const [id, name] = g.split("|");
    return { id, name };
  });

describe("buildSectionsByGroup", () => {
  it("returns empty grouping for no rows", () => {
    const { sections, ungrouped } = buildSectionsByGroup([], groupsOf);
    expect(sections).toEqual([]);
    expect(ungrouped).toEqual([]);
  });

  it("puts rows without groups in ungrouped", () => {
    const rows = [{ id: "r1", groups: [] }];
    const { sections, ungrouped } = buildSectionsByGroup(rows, groupsOf);
    expect(sections).toEqual([]);
    expect(ungrouped).toEqual(rows);
  });

  it("buckets rows by their group, sorted by name", () => {
    const rows = [
      { id: "r1", groups: ["g2|مجموعة ب"] },
      { id: "r2", groups: ["g1|مجموعة أ"] },
      { id: "r3", groups: ["g2|مجموعة ب"] },
    ];
    const { sections } = buildSectionsByGroup(rows, groupsOf);
    expect(sections.map((s) => s.name)).toEqual(["مجموعة أ", "مجموعة ب"]);
    expect(sections[1].list.map((r) => r.id)).toEqual(["r1", "r3"]);
  });

  it("appears in each section when a row has several groups", () => {
    const rows = [{ id: "r1", groups: ["g1|A", "g2|B"] }];
    const { sections, ungrouped } = buildSectionsByGroup(rows, groupsOf);
    expect(ungrouped).toEqual([]);
    expect(sections).toHaveLength(2);
    expect(sections.every((s) => s.list.some((r) => r.id === "r1"))).toBe(true);
  });
});

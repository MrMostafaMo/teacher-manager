import { describe, expect, it } from "vitest";
import {
  compareGroupsByName,
  compareGroupsWithRoom,
  firstSessionRoom,
  groupSortKey,
} from "./group-sort";

const names = (...list: string[]) => list.map((name) => ({ name }));

describe("groupSortKey", () => {
  it("parses stage + grade from a standard class name", () => {
    const key = groupSortKey("الصف الأول الإعدادي");
    expect(key.stage).toBe(2);
    expect(key.grade).toBe(1);
  });

  it("parses روضة before ابتدائي before إعدادي before ثانوي", () => {
    const stage = (name: string) => groupSortKey(name).stage;
    expect(stage("الصف الأول الابتدائي")).toBe(1);
    expect(stage("الصف الأول الإعدادي")).toBe(2);
    expect(stage("الصف الأول الثانوي")).toBe(3);
    expect(stage("روضة")).toBe(0);
    expect(stage("KG1")).toBe(0);
    expect(stage("حضانة")).toBe(0);
  });

  it("handles spelling variants (إ/ة/tashkeel)", () => {
    expect(groupSortKey("الصف الثالث الإبتدائي").stage).toBe(1);
    expect(groupSortKey("الصف الأول الاعدادى").stage).toBe(2);
  });

  it("parses ordinals up to الثاني عشر and digit grades", () => {
    expect(groupSortKey("الصف العاشر الابتدائي").grade).toBe(10);
    expect(groupSortKey("الصف الحادي عشر الإعدادي").grade).toBe(11);
    expect(groupSortKey("الصف الثاني عشر الثانوي").grade).toBe(12);
    expect(groupSortKey("أولى إعدادي").grade).toBe(1);
    expect(groupSortKey("الصف 5 الابتدائي").grade).toBe(5);
    expect(groupSortKey("الصف ٦ الإبتدائي").grade).toBe(6);
  });

  it("returns Infinity for names outside the pattern", () => {
    const key = groupSortKey("فريق المتفوقين");
    expect(key.stage).toBe(Number.POSITIVE_INFINITY);
    expect(key.grade).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("compareGroupsByName", () => {
  it("orders by stage then grade", () => {
    const list = names(
      "الصف الثالث الإعدادي",
      "الصف الأول الإبتدائي",
      "الصف السادس الإبتدائي",
      "الصف الثاني الإعدادي",
    );
    expect(list.sort(compareGroupsByName).map((g) => g.name)).toEqual([
      "الصف الأول الإبتدائي",
      "الصف السادس الإبتدائي",
      "الصف الثاني الإعدادي",
      "الصف الثالث الإعدادي",
    ]);
  });

  it("sorts the real center groups as expected", () => {
    const list = names(
      "الصف الثالث الإعدادي",
      "الصف الأول الإعدادي",
      "الصف الخامس الإبتدائي",
      "الصف الثاني الإعدادي",
      "الصف الثالث الإبتدائي",
      "الصف الرابع الإبتدائي",
      "الصف السادس الإبتدائي",
    );
    expect(list.sort(compareGroupsByName).map((g) => g.name)).toEqual([
      "الصف الثالث الإبتدائي",
      "الصف الرابع الإبتدائي",
      "الصف الخامس الإبتدائي",
      "الصف السادس الإبتدائي",
      "الصف الأول الإعدادي",
      "الصف الثاني الإعدادي",
      "الصف الثالث الإعدادي",
    ]);
  });

  it("places روضة first and non-pattern names last alphabetically", () => {
    const list = names("فريق المتفوقين", "روضة النخيل", "الصف الأول الإبتدائي");
    expect(list.sort(compareGroupsByName).map((g) => g.name)).toEqual([
      "روضة النخيل",
      "الصف الأول الإبتدائي",
      "فريق المتفوقين",
    ]);
  });
});

describe("compareGroupsWithRoom", () => {
  it("orders real rooms by name, then no room, then اونلاين last", () => {
    const list = [
      { name: "الصف الأول الإعدادي", room: "" },
      { name: "الصف الأول الإعدادي", room: "قاعة ٢" },
      { name: "الصف الأول الإعدادي", room: "اونلاين" },
      { name: "الصف الأول الإعدادي", room: "قاعة ١" },
    ];
    expect(list.sort(compareGroupsWithRoom).map((g) => g.room)).toEqual([
      "قاعة ١",
      "قاعة ٢",
      "",
      "اونلاين",
    ]);
  });

  it("detects online variants", () => {
    expect(groupSortKey("الصف الأول الإعدادي", "online").roomTier).toBe(2);
    expect(groupSortKey("الصف الأول الإعدادي", "أونلاين").roomTier).toBe(2);
    expect(groupSortKey("الصف الأول الإعدادي", "قاعة ١").roomTier).toBe(0);
    expect(groupSortKey("الصف الأول الإعدادي").roomTier).toBe(1);
  });

  it("breaks ties by stage+grade before the room tier", () => {
    const list = [
      { name: "الصف الثاني الإعدادي", room: "اونلاين" },
      { name: "الصف الأول الإعدادي", room: "اونلاين" },
    ];
    expect(list.sort(compareGroupsWithRoom).map((g) => g.name)).toEqual([
      "الصف الأول الإعدادي",
      "الصف الثاني الإعدادي",
    ]);
  });
});

describe("firstSessionRoom", () => {
  it("returns the room of the earliest session by day then time", () => {
    const sessions = [
      { dayOfWeek: 3, startTime: "18:00", room: null },
      { dayOfWeek: 0, startTime: "18:00", room: "قاعة ١" },
    ];
    expect(firstSessionRoom(sessions)).toBe("قاعة ١");
  });

  it("returns undefined when all rooms are empty", () => {
    const sessions = [
      { dayOfWeek: 0, startTime: "18:00", room: null },
      { dayOfWeek: 3, startTime: "18:00", room: "" },
    ];
    expect(firstSessionRoom(sessions)).toBeUndefined();
  });
});

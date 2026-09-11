import { describe, expect, it, vi } from "vitest";
import { routeSessionMenuItem, sessionMenuItems } from "./session-menu-items";

describe("sessionMenuItems", () => {
  it("lists attend/occurrence/edit/delete for a normal session", () => {
    expect(sessionMenuItems({ oneOff: false, moved: false, cancelled: false })).toEqual([
      "attend",
      "occurrence",
      "edit",
      "delete",
    ]);
  });

  it("lists attend/delete for a plain one-off session", () => {
    expect(sessionMenuItems({ oneOff: true, moved: false, cancelled: false })).toEqual([
      "attend",
      "delete",
    ]);
  });

  it("adds restoreMoved for a moved one-off session", () => {
    expect(sessionMenuItems({ oneOff: true, moved: true, cancelled: false })).toEqual([
      "attend",
      "restoreMoved",
      "delete",
    ]);
  });

  it("lists only restore for a cancelled occurrence", () => {
    expect(sessionMenuItems({ oneOff: false, moved: false, cancelled: true })).toEqual(["restore"]);
  });
});

describe("routeSessionMenuItem", () => {
  function callbacks() {
    return { onAttend: vi.fn(), onOccurrence: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn() };
  }

  it("routes attend/edit/delete to their callbacks", () => {
    const cbs = callbacks();
    routeSessionMenuItem("attend", cbs);
    routeSessionMenuItem("edit", cbs);
    routeSessionMenuItem("delete", cbs);
    expect(cbs.onAttend).toHaveBeenCalledOnce();
    expect(cbs.onEdit).toHaveBeenCalledOnce();
    expect(cbs.onDelete).toHaveBeenCalledOnce();
    expect(cbs.onOccurrence).not.toHaveBeenCalled();
  });

  it("routes occurrence/restore/restoreMoved to onOccurrence", () => {
    const cbs = callbacks();
    routeSessionMenuItem("occurrence", cbs);
    routeSessionMenuItem("restore", cbs);
    routeSessionMenuItem("restoreMoved", cbs);
    expect(cbs.onOccurrence).toHaveBeenCalledTimes(3);
  });
});

// @ts-ignore jsdom has no bundled types in this repo
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { cycleTabFocus } from "./cycle-tab-focus";

function pressTab(dom: JSDOM, shift = false) {
  const e = new dom.window.KeyboardEvent("keydown", {
    key: "Tab",
    shiftKey: shift,
    bubbles: true,
    cancelable: true,
  });
  dom.window.document.dispatchEvent(e);
  cycleTabFocus(e, dom.window.document.getElementById("c"));
  return dom.window.document.activeElement;
}

describe("cycleTabFocus", () => {
  it("moves focus forward and wraps", () => {
    const dom = new JSDOM(
      `<div id="c"><button id="a">a</button><button id="b" disabled>b</button><input id="i"/></div>`,
    );
    const { window } = dom;
    (window.document.getElementById("a") as HTMLElement).focus();
    expect(pressTab(dom)?.id).toBe("i"); // skips disabled "b"
    expect(pressTab(dom)?.id).toBe("a"); // wraps
  });

  it("moves focus back with shift", () => {
    const dom = new JSDOM(
      `<div id="c"><button id="a">a</button><input id="i"/></div>`,
    );
    const { window } = dom;
    (window.document.getElementById("i") as HTMLElement).focus();
    expect(pressTab(dom, true)?.id).toBe("a");
    expect(pressTab(dom, true)?.id).toBe("i"); // wraps backwards
  });

  it("pulls outside focus into the container", () => {
    const dom = new JSDOM(`<div id="c"><button id="a">a</button><input id="i"/></div>`);
    const { window } = dom;
    (window.document.body as HTMLElement).focus();
    expect(pressTab(dom)?.id).toBe("a"); // first, on forward
  });

  it("ignores non-Tab keys", () => {
    const dom = new JSDOM(`<div id="c"><button id="a">a</button></div>`);
    const { window } = dom;
    (window.document.getElementById("a") as HTMLElement).focus();
    const e = new window.KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    window.document.dispatchEvent(e);
    cycleTabFocus(e, window.document.getElementById("c"));
    expect(e.defaultPrevented).toBe(false);
    expect(window.document.activeElement.id).toBe("a");
  });
});

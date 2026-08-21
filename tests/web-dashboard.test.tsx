import { App } from "../apps/web/src/App";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

describe("web dashboard shell", () => {
  it("renders the M3 readiness, inventory, and maintenance surface", () => {
    const html = renderToString(<App />);

    expect(html).toContain("Basecamp Operations");
    expect(html).toContain("Readiness Score");
    expect(html).toContain("Recommended Next");
    expect(html).toContain("Quick Inventory");
    expect(html).toContain("Locations");
    expect(html).toContain("Acquisition Rollup");
    expect(html).toContain("Assets And QR Tags");
    expect(html).toContain("Category Pursuit");
    expect(html).toContain("Quest Backlog");
    expect(html).toContain("Critical Gaps");
  });
});

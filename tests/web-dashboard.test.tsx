import { App } from "../apps/web/src/App";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

describe("web dashboard shell", () => {
  it("renders the M1 dashboard surface", () => {
    const html = renderToString(<App />);

    expect(html).toContain("Dashboard");
    expect(html).toContain("Readiness Score");
    expect(html).toContain("Recommended Next");
    expect(html).toContain("Category Levels");
    expect(html).toContain("Upcoming Maintenance");
  });
});

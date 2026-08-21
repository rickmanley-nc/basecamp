import { App } from "../apps/web/src/App";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

describe("web dashboard shell", () => {
  it("renders the M2 readiness and quest core surface", () => {
    const html = renderToString(<App />);

    expect(html).toContain("Readiness Core");
    expect(html).toContain("Readiness Score");
    expect(html).toContain("Recommended Next");
    expect(html).toContain("Category Pursuit");
    expect(html).toContain("Quest Backlog");
    expect(html).toContain("Critical Gaps");
  });
});

import { describe, expect, it } from "vitest";

describe("Skill 周刊 project", () => {
  it("exports the site title used by the landing page", async () => {
    const { SITE_TITLE } = await import("../src/lib/site");

    expect(SITE_TITLE).toBe("Skill 周刊");
  });
});

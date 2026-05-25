import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("static pages", () => {
  it("builds the latest issue permalink with its reading sections", () => {
    execFileSync(process.execPath, ["node_modules/astro/astro.js", "build"], {
      stdio: "pipe"
    });

    const home = readFileSync("dist/index.html", "utf8");
    const issue = readFileSync("dist/issues/2026-05-25/index.html", "utf8");
    expect(home).toContain("Skill 周刊 · 第 01 期");
    expect(issue).toContain("正式精选");
    expect(issue).toContain("持续热门");
    expect(issue).toContain("风险观察");
    expect(issue).toContain("不构成安全背书");
  });
});

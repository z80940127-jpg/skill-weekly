import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { persistIssue } from "../scripts/lib/write-issue";

describe("persistIssue", () => {
  it("writes a validated issue only after all generated fields exist", () => {
    const directory = mkdtempSync(join(tmpdir(), "skill-weekly-"));

    persistIssue(directory, {
      slug: "2026-05-25",
      issueNumber: 1,
      publishedAt: "2026-05-25",
      title: "Skill 周刊 · 第 01 期",
      intro: "本周通过自动流程找到可供了解的开源 Skill。",
      shortfallReason: "本周没有项目达到正式精选门槛。",
      featured: [],
      stillHot: [],
      watch: [],
      sources: ["https://www.skills.sh/trending"]
    });

    expect(JSON.parse(
      readFileSync(join(directory, "2026-05-25.json"), "utf8")
    )).toHaveProperty("slug", "2026-05-25");
  });

  it("does not write invalid issue input", () => {
    const directory = mkdtempSync(join(tmpdir(), "skill-weekly-"));

    expect(() => persistIssue(directory, { slug: "bad" })).toThrow();
    expect(readdirSync(directory)).toEqual([]);
  });
});

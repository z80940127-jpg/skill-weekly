import { describe, expect, it } from "vitest";
import { issueSchema } from "../src/lib/issue-schema";

const item = {
  key: "owner/repo:skill-a",
  source: "owner/repo",
  skillId: "skill-a",
  name: "Skill A",
  repositoryUrl: "https://github.com/owner/repo",
  sourceUrl: "https://www.skills.sh/owner/repo/skill-a",
  summary: "帮助用户更快整理研究资料并形成清晰摘要。",
  audience: "需要整理资料的 AI 工具使用者",
  compatibility: ["未说明"],
  reason: "近期热度明显，且用途容易理解。",
  caution: "安装前请检查项目权限与说明。",
  metrics: { installs: 1200, weeklyInstalls: [40, 60] }
};

const issue = {
  slug: "2026-05-25",
  issueNumber: 1,
  publishedAt: "2026-05-25",
  title: "Skill 周刊 · 第 01 期",
  intro: "本周发现的开源 Agent Skills，适合快速了解。",
  shortfallReason: "本期仅有 1 个项目通过自动核验。",
  featured: [{ ...item, status: "featured" }],
  stillHot: [],
  watch: [],
  sources: ["https://www.skills.sh/trending", "https://github.com/owner/repo"]
};

describe("issueSchema", () => {
  it("accepts an issue with fewer than five explained formal selections", () => {
    const parsed = issueSchema.parse(issue);

    expect(parsed.featured).toHaveLength(1);
  });

  it("rejects a skill repeated between formal and additional sections", () => {
    expect(() => issueSchema.parse({
      ...issue,
      stillHot: [{ ...item, status: "still-hot" }]
    })).toThrow("A skill can appear only once per issue.");
  });

  it("requires an explanation when formal selections are fewer than five", () => {
    expect(() => issueSchema.parse({
      ...issue,
      shortfallReason: null
    })).toThrow("Fewer than five formal selections requires an explanation.");
  });
});

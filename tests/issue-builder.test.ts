import { describe, expect, it } from "vitest";
import { assembleIssue } from "../scripts/lib/issue-builder";

const evidence = {
  candidate: {
    key: "owner/repo:alpha",
    source: "owner/repo",
    skillId: "alpha",
    name: "Alpha",
    installs: 400,
    weeklyInstalls: [20, 80],
    installsYesterday: 17,
    change: 9,
    isOfficial: false,
    sourceView: "trending" as const,
    rank: 1,
    skillsUrl: "https://www.skills.sh/owner/repo/alpha"
  },
  repositoryUrl: "https://github.com/owner/repo",
  licenseSpdx: "MIT",
  description: "Useful skill",
  readme: "For Codex users.",
  skillText: "Safe workflow.",
  compatibility: ["Codex"]
};

const copy = {
  key: "owner/repo:alpha",
  summary: "帮助用户更清楚地处理任务步骤与资料。",
  audience: "需要整理流程的 AI 用户",
  reason: "项目用途明确且近期受到关注。",
  caution: "安装前仍需阅读原项目说明。"
};

describe("assembleIssue", () => {
  it("keeps watch cautions deterministic and records formal shortfalls", () => {
    const issue = assembleIssue({
      publishedAt: "2026-05-25",
      issueNumber: 1,
      featured: [evidence],
      stillHot: [],
      watch: [{ ...evidence, candidate: { ...evidence.candidate, key: "owner/watch:beta" } }],
      copy: [copy, { ...copy, key: "owner/watch:beta" }]
    });

    expect(issue.shortfallReason).toContain("仅有 1 个新项目");
    expect(issue.watch[0].caution).toContain("未进入正式精选");
    expect(issue.featured[0].repositoryUrl).toBe("https://github.com/owner/repo");
    expect(issue.featured[0].metrics.installsYesterday).toBe(17);
    expect(issue.featured[0].metrics.change).toBe(9);
  });
});

import { describe, expect, it } from "vitest";
import { createChineseCopy } from "../scripts/lib/models";

const evidence = [{
  candidate: {
    key: "owner/repo:alpha",
    source: "owner/repo",
    skillId: "alpha",
    name: "Alpha",
    installs: 400,
    weeklyInstalls: [20, 80],
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
}];

describe("createChineseCopy", () => {
  it("returns validated structured Chinese card copy", async () => {
    const result = await createChineseCopy(
      evidence,
      "token",
      (async () => new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify([{
          key: "owner/repo:alpha",
          summary: "帮助用户更清楚地处理任务步骤与资料。",
          audience: "需要整理流程的 AI 用户",
          reason: "项目用途明确且近期受到关注。",
          caution: "安装前仍需阅读原项目说明。"
        }]) } }]
      }), { status: 200 })) as unknown as typeof fetch
    );

    expect(result[0].key).toBe("owner/repo:alpha");
    expect(result[0].summary).toContain("帮助用户");
  });

  it("fails closed when the model response is not structured card data", async () => {
    await expect(createChineseCopy(
      evidence,
      "token",
      (async () => new Response(JSON.stringify({
        choices: [{ message: { content: "not-json" } }]
      }), { status: 200 })) as unknown as typeof fetch
    )).rejects.toThrow();
  });
});

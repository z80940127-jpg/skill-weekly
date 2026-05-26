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
    let requestedUrl = "";
    let requestedInit: RequestInit | undefined;
    const result = await createChineseCopy(
      evidence,
      "token",
      (async (url: URL | RequestInfo, init?: RequestInit) => {
        requestedUrl = String(url);
        requestedInit = init;

        return new Response(JSON.stringify({
          choices: [{ message: { content: JSON.stringify([{
            key: "owner/repo:alpha",
            summary: "帮助用户更清楚地处理任务步骤与资料。",
            audience: "需要整理流程的 AI 用户",
            reason: "项目用途明确且近期受到关注。",
            caution: "安装前仍需阅读原项目说明。"
          }]) } }]
        }), { status: 200 });
      }) as unknown as typeof fetch
    );

    expect(result[0].key).toBe("owner/repo:alpha");
    expect(result[0].summary).toContain("帮助用户");
    expect(requestedUrl).toBe("https://models.github.ai/inference/chat/completions");
    const headers = new Headers(requestedInit?.headers);
    expect(headers.get("Accept")).toBe("application/vnd.github+json");
    expect(headers.get("X-GitHub-Api-Version")).toBe("2026-03-10");
    expect(JSON.parse(String(requestedInit?.body)).model).toBe("openai/gpt-4.1");
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

  it("keeps multi-card documentation excerpts within the model prompt budget", async () => {
    const manyItems = Array.from({ length: 15 }, (_, index) => ({
      ...evidence[0],
      candidate: {
        ...evidence[0].candidate,
        key: `owner/repo:skill-${index}`,
        skillId: `skill-${index}`,
        name: `Skill ${index}`
      },
      description: "D".repeat(1_000),
      readme: "R".repeat(10_000),
      skillText: "S".repeat(10_000)
    }));
    let promptContent = "";

    await createChineseCopy(
      manyItems,
      "token",
      (async (_url: URL | RequestInfo, init?: RequestInit) => {
        const requestBody = JSON.parse(String(init?.body));
        promptContent = requestBody.messages[1].content;

        return new Response(JSON.stringify({
          choices: [{ message: { content: JSON.stringify(manyItems.map((item) => ({
            key: item.candidate.key,
            summary: "Public documentation provides a readable skill overview.",
            audience: "AI tool users reviewing public skills",
            reason: "Public evidence is available for editorial review.",
            caution: "Review the repository before trying the workflow."
          }))) } }]
        }), { status: 200 });
      }) as unknown as typeof fetch
    );

    expect(promptContent.length).toBeLessThanOrEqual(20_000);
  });
});

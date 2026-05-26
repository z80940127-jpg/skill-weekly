import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runPublication } from "../scripts/lib/run-publication";
import type { Evidence } from "../scripts/lib/github";
import type { Candidate } from "../scripts/lib/types";
import { persistIssue } from "../scripts/lib/write-issue";

const temporaryDirectories: string[] = [];

function directory(): string {
  const result = mkdtempSync(join(tmpdir(), "skill-weekly-"));
  temporaryDirectories.push(result);
  return result;
}

function candidate(skillId: string, name: string): Candidate {
  return {
    key: `owner/repo:${skillId}`,
    source: "owner/repo",
    skillId,
    name,
    installs: 100,
    weeklyInstalls: [10, 30],
    isOfficial: false,
    sourceView: "trending",
    rank: 1,
    skillsUrl: `https://www.skills.sh/owner/repo/${skillId}`
  };
}

function evidence(item: Candidate): Evidence {
  return {
    candidate: item,
    repositoryUrl: "https://github.com/owner/repo",
    licenseSpdx: "MIT",
    description: `${item.name} description`,
    readme: "Supports Codex.",
    skillText: "A documented safe workflow.",
    compatibility: ["Codex"]
  };
}

function priorCard(item: Candidate) {
  return {
    key: item.key,
    source: item.source,
    skillId: item.skillId,
    name: item.name,
    repositoryUrl: "https://github.com/owner/repo",
    sourceUrl: item.skillsUrl,
    summary: "此前已经精选过的热门开源技能项目。",
    audience: "需要整理工作流的 AI 用户",
    compatibility: ["Codex"],
    reason: "具备公开文档和许可信息，可继续阅读。",
    caution: "使用前应查看项目当前文档与权限需求。",
    metrics: {
      installs: item.installs,
      weeklyInstalls: item.weeklyInstalls
    },
    status: "featured" as const
  };
}

afterEach(() => {
  for (const path of temporaryDirectories.splice(0)) {
    rmSync(path, { recursive: true, force: true });
  }
});

describe("runPublication", () => {
  it("publishes new verified projects while moving past selections to still hot", async () => {
    const issueDirectory = directory();
    const alpha = candidate("alpha", "Alpha");
    const beta = candidate("beta", "Beta");

    persistIssue(issueDirectory, {
      slug: "2026-05-18",
      issueNumber: 1,
      publishedAt: "2026-05-18",
      title: "Skill 周刊 · 第 01 期",
      intro: "此前一期已经通过自动校验发布，供历史去重测试读取。",
      shortfallReason: "本期仅有 1 个新项目通过自动核验，未为凑数降低门槛。",
      featured: [priorCard(alpha)],
      stillHot: [],
      watch: [],
      sources: ["https://www.skills.sh/trending"]
    });

    const result = await runPublication({
      issueDirectory,
      publishedAt: "2026-05-25",
      token: "token"
    }, {
      fetchCandidates: vi.fn(async () => [alpha, beta]),
      fetchEvidence: vi.fn(async (item) => evidence(item)),
      createChineseCopy: vi.fn(async (items: Evidence[]) => items.map((item) => ({
        key: item.candidate.key,
        summary: `${item.candidate.name} 提供了公开可阅读的技能说明内容。`,
        audience: "关注开源技能的 AI 工具用户",
        reason: "近期热度与公开证据同时可供读者核查。",
        caution: "安装或运行前请先审阅仓库内容与权限。"
      }))),
      persistIssue
    });

    expect(result.created).toBe(true);
    expect(result.issue?.issueNumber).toBe(2);
    expect(result.issue?.featured.map((item) => item.key)).toEqual([beta.key]);
    expect(result.issue?.stillHot.map((item) => item.key)).toEqual([alpha.key]);

    const saved = JSON.parse(readFileSync(join(issueDirectory, "2026-05-25.json"), "utf8"));
    expect(saved.featured[0].key).toBe(beta.key);
  });

  it("does not write a partial issue when Chinese copy generation fails", async () => {
    const issueDirectory = directory();
    const alpha = candidate("alpha", "Alpha");

    await expect(runPublication({
      issueDirectory,
      publishedAt: "2026-05-25",
      token: "token"
    }, {
      fetchCandidates: async () => [alpha],
      fetchEvidence: async (item) => evidence(item),
      createChineseCopy: async () => { throw new Error("model unavailable"); },
      persistIssue
    })).rejects.toThrow("model unavailable");

    expect(existsSync(join(issueDirectory, "2026-05-25.json"))).toBe(false);
  });

  it("is idempotent when an issue already exists for the publication date", async () => {
    const issueDirectory = directory();
    const alpha = candidate("alpha", "Alpha");

    persistIssue(issueDirectory, {
      slug: "2026-05-25",
      issueNumber: 1,
      publishedAt: "2026-05-25",
      title: "Skill 周刊 · 第 01 期",
      intro: "已经存在的合法一期应阻止相同日期再次生成。",
      shortfallReason: "本期仅有 1 个新项目通过自动核验，未为凑数降低门槛。",
      featured: [priorCard(alpha)],
      stillHot: [],
      watch: [],
      sources: ["https://www.skills.sh/trending"]
    });
    const fetchCandidates = vi.fn(async () => [alpha]);

    const result = await runPublication({
      issueDirectory,
      publishedAt: "2026-05-25",
      token: "token"
    }, {
      fetchCandidates,
      fetchEvidence: async (item) => evidence(item),
      createChineseCopy: async () => [],
      persistIssue
    });

    expect(result.created).toBe(false);
    expect(result.issue?.slug).toBe("2026-05-25");
    expect(fetchCandidates).not.toHaveBeenCalled();
  });

  it("does not let one unverified repository consume the inspection budget", async () => {
    const issueDirectory = directory();
    const overloaded = ["alpha", "beta", "gamma", "delta"].map((skillId) => ({
      ...candidate(skillId, skillId),
      source: "owner/watch",
      key: `owner/watch:${skillId}`
    }));
    const verified = {
      ...candidate("formal", "Formal"),
      source: "owner/formal",
      key: "owner/formal:formal"
    };

    const result = await runPublication({
      issueDirectory,
      publishedAt: "2026-05-25",
      token: "token",
      candidateLimit: 4
    }, {
      fetchCandidates: async () => [...overloaded, verified],
      fetchEvidence: async (item) => item.source === "owner/watch"
        ? { ...evidence(item), licenseSpdx: null }
        : evidence(item),
      createChineseCopy: async (items) => items.map((item) => ({
        key: item.candidate.key,
        summary: `${item.candidate.name} 提供了公开可阅读的技能说明内容。`,
        audience: "关注开源技能的 AI 工具用户",
        reason: "近期热度与公开证据同时可供读者核查。",
        caution: "安装或运行前请先审阅仓库内容与权限。"
      })),
      persistIssue
    });

    expect(result.issue.featured.map((item) => item.key)).toContain(verified.key);
  });

  it("skips leaderboard sources that are not GitHub repository paths", async () => {
    const issueDirectory = directory();
    const external = {
      ...candidate("external", "External"),
      source: "open.feishu.cn",
      key: "open.feishu.cn:external"
    };
    const verified = {
      ...candidate("formal", "Formal"),
      source: "owner/formal",
      key: "owner/formal:formal"
    };
    const fetchEvidence = vi.fn(async (item: Candidate) => evidence(item));

    const result = await runPublication({
      issueDirectory,
      publishedAt: "2026-05-25",
      token: "token",
      candidateLimit: 1
    }, {
      fetchCandidates: async () => [external, verified],
      fetchEvidence,
      createChineseCopy: async (items) => items.map((item) => ({
        key: item.candidate.key,
        summary: `${item.candidate.name} provides readable public skill documentation.`,
        audience: "AI tool users evaluating open source skills",
        reason: "Recent activity and public evidence can both be inspected.",
        caution: "Review repository contents and permissions before use."
      })),
      persistIssue
    });

    expect(result.issue.featured.map((item) => item.key)).toContain(verified.key);
    expect(fetchEvidence).not.toHaveBeenCalledWith(external, "token");
  });
});

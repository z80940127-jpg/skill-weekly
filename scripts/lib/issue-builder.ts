import { issueSchema, type Issue } from "../../src/lib/issue-schema";
import type { Evidence } from "./github";
import type { GeneratedCopy } from "./models";

interface IssueInput {
  publishedAt: string;
  issueNumber: number;
  featured: Evidence[];
  stillHot: Evidence[];
  watch: Evidence[];
  copy: GeneratedCopy[];
}

export function assembleIssue(input: IssueInput): Issue {
  const copyByKey = new Map(input.copy.map((copy) => [copy.key, copy]));
  const requireCopy = (item: Evidence): GeneratedCopy => {
    const copy = copyByKey.get(item.candidate.key);

    if (!copy) {
      throw new Error(`Model output missing card: ${item.candidate.key}`);
    }

    return copy;
  };
  const card = (
    item: Evidence,
    status: "featured" | "still-hot" | "watch"
  ) => {
    const copy = requireCopy(item);

    return {
      key: item.candidate.key,
      source: item.candidate.source,
      skillId: item.candidate.skillId,
      name: item.candidate.name,
      repositoryUrl: item.repositoryUrl,
      sourceUrl: item.candidate.skillsUrl,
      summary: copy.summary,
      audience: copy.audience,
      compatibility: item.compatibility,
      reason: copy.reason,
      caution: status === "watch"
        ? "公开信息不足，未进入正式精选；请勿直接安装。"
        : copy.caution,
      metrics: {
        installs: item.candidate.installs,
        weeklyInstalls: item.candidate.weeklyInstalls
      },
      status
    };
  };
  const selected = [...input.featured, ...input.stillHot, ...input.watch];
  const sources = new Set([
    "https://www.skills.sh/trending",
    "https://www.skills.sh/hot",
    ...selected.map((item) => item.repositoryUrl)
  ]);

  return issueSchema.parse({
    slug: input.publishedAt,
    issueNumber: input.issueNumber,
    publishedAt: input.publishedAt,
    title: `Skill 周刊 · 第 ${String(input.issueNumber).padStart(2, "0")} 期`,
    intro: "本期依据近期热度与公开仓库信息，整理可供中文读者了解的开源 Agent Skills。",
    shortfallReason: input.featured.length < 5
      ? `本期仅有 ${input.featured.length} 个新项目通过自动核验，未为凑数降低门槛。`
      : null,
    featured: input.featured.map((item) => card(item, "featured")),
    stillHot: input.stillHot.map((item) => card(item, "still-hot")),
    watch: input.watch.map((item) => card(item, "watch")),
    sources: [...sources]
  });
}

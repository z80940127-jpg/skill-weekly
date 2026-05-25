import type { Candidate } from "./types";

interface RepositoryResponse {
  archived: boolean;
  default_branch: string;
  description: string | null;
  html_url: string;
  private: boolean;
}

interface ContentResponse {
  content?: string;
}

interface TreeResponse {
  tree?: Array<{ path: string }>;
}

interface LicenseResponse {
  license?: { spdx_id?: string | null };
}

export interface Evidence {
  candidate: Candidate;
  repositoryUrl: string;
  licenseSpdx: string | null;
  description: string;
  readme: string;
  skillText: string | null;
  compatibility: string[];
}

function decodeContent(content?: string): string {
  return content
    ? Buffer.from(content.replaceAll("\n", ""), "base64").toString("utf8")
    : "";
}

function extractCompatibility(text: string): string[] {
  const tools = [
    { marker: "codex", name: "Codex" },
    { marker: "claude code", name: "Claude Code" },
    { marker: "cursor", name: "Cursor" },
    { marker: "gemini", name: "Gemini" }
  ];
  const body = text.toLowerCase();
  const compatible = tools
    .filter(({ marker }) => body.includes(marker))
    .map(({ name }) => name);

  return compatible.length > 0 ? compatible : ["未说明"];
}

export async function fetchEvidence(
  candidate: Candidate,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<Evidence> {
  if (!/^[^/]+\/[^/]+$/.test(candidate.source)) {
    throw new Error(`Candidate does not map to a GitHub repository: ${candidate.source}`);
  }

  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28"
  };
  const request = async <T>(path: string): Promise<T | null> => {
    const response = await fetcher(
      `https://api.github.com/repos/${candidate.source}${path}`,
      { headers }
    );

    if (!response.ok) {
      return null;
    }

    return await response.json() as T;
  };
  const repository = await request<RepositoryResponse>("");

  if (!repository || repository.private || repository.archived) {
    throw new Error(`Repository is not public and active: ${candidate.source}`);
  }

  const [license, readme, tree] = await Promise.all([
    request<LicenseResponse>("/license"),
    request<ContentResponse>("/readme"),
    request<TreeResponse>(`/git/trees/${repository.default_branch}?recursive=1`)
  ]);
  const skillFiles = tree?.tree?.filter(({ path }) =>
    path.toLowerCase().endsWith("skill.md")
  ) ?? [];
  const matchingSkill = skillFiles.find(({ path }) =>
    path.toLowerCase().includes(candidate.skillId.toLowerCase())
  );
  const skillPath = matchingSkill?.path ??
    (skillFiles.length === 1 ? skillFiles[0].path : undefined);
  const skill = skillPath
    ? await request<ContentResponse>(
      `/contents/${encodeURIComponent(skillPath).replaceAll("%2F", "/")}`
    )
    : null;
  const readmeText = decodeContent(readme?.content);
  const skillText = skill?.content ? decodeContent(skill.content) : null;
  const spdx = license?.license?.spdx_id;

  return {
    candidate,
    repositoryUrl: repository.html_url,
    licenseSpdx: spdx && spdx !== "NOASSERTION" ? spdx : null,
    description: repository.description ?? "",
    readme: readmeText,
    skillText,
    compatibility: extractCompatibility(`${readmeText}\n${skillText ?? ""}`)
  };
}

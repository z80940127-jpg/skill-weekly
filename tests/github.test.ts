import { describe, expect, it } from "vitest";
import { fetchEvidence } from "../scripts/lib/github";

const candidate = {
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
};

function createFetcher(responses: Record<string, unknown>) {
  return async (url: string | URL | Request) => {
    const pathname = String(url).replace("https://api.github.com/repos/owner/repo", "");
    const payload = responses[pathname];

    return new Response(JSON.stringify(payload), {
      status: payload === undefined ? 404 : 200,
      headers: { "Content-Type": "application/json" }
    });
  };
}

describe("fetchEvidence", () => {
  it("reads public repository evidence and falls back to a single SKILL.md", async () => {
    const evidence = await fetchEvidence(
      candidate,
      "token",
      createFetcher({
        "": {
          private: false,
          archived: false,
          default_branch: "main",
          html_url: "https://github.com/owner/repo",
          description: "A reusable workflow."
        },
        "/license": { license: { spdx_id: "MIT" } },
        "/readme": {
          content: Buffer.from("Compatible with Codex and Cursor.").toString("base64")
        },
        "/git/trees/main?recursive=1": { tree: [{ path: "SKILL.md" }] },
        "/contents/SKILL.md": {
          content: Buffer.from("Use this skill carefully.").toString("base64")
        }
      }) as typeof fetch
    );

    expect(evidence.licenseSpdx).toBe("MIT");
    expect(evidence.skillText).toContain("carefully");
    expect(evidence.compatibility).toEqual(["Codex", "Cursor"]);
  });

  it("refuses archived repositories", async () => {
    await expect(fetchEvidence(
      candidate,
      "token",
      createFetcher({
        "": {
          private: false,
          archived: true,
          default_branch: "main",
          html_url: "https://github.com/owner/repo",
          description: "Old workflow."
        }
      }) as typeof fetch
    )).rejects.toThrow("Repository is not public and active");
  });
});

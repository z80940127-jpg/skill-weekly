import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseLeaderboardHtml } from "../scripts/lib/skills-sh";

const fixture = readFileSync("tests/fixtures/skills-sh-trending.html", "utf8");

describe("parseLeaderboardHtml", () => {
  it("extracts visible source identity and popularity fields", () => {
    const candidates = parseLeaderboardHtml(fixture, "trending");

    expect(candidates[0]).toMatchObject({
      key: "owner/alpha:alpha",
      installs: 300,
      sourceView: "trending",
      rank: 1,
      isOfficial: true
    });
    expect(candidates[0].weeklyInstalls).toEqual([10, 40]);
  });

  it("fails rather than publishing against an unknown page shape", () => {
    expect(() => parseLeaderboardHtml("<html>changed</html>", "hot"))
      .toThrow("No skills.sh candidates");
  });
});

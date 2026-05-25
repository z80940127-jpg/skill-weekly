import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseLeaderboardHtml } from "../scripts/lib/skills-sh";

const fixture = readFileSync("tests/fixtures/skills-sh-trending.html", "utf8");
const hotFixture = readFileSync("tests/fixtures/skills-sh-hot.html", "utf8");

describe("parseLeaderboardHtml", () => {
  it("extracts current trending entries when only total installs are shown", () => {
    const candidates = parseLeaderboardHtml(fixture, "trending");

    expect(candidates[0]).toMatchObject({
      key: "owner/alpha:alpha",
      installs: 300,
      sourceView: "trending",
      rank: 1,
      isOfficial: true
    });
    expect(candidates[0].weeklyInstalls).toBeUndefined();
  });

  it("extracts current hot entries with yesterday and change metrics", () => {
    const candidates = parseLeaderboardHtml(hotFixture, "hot");

    expect(candidates[0]).toMatchObject({
      key: "owner/gamma:gamma",
      installs: 153,
      installsYesterday: 19,
      change: 134,
      sourceView: "hot"
    });
    expect(candidates[0].weeklyInstalls).toBeUndefined();
  });

  it("fails rather than publishing against an unknown page shape", () => {
    expect(() => parseLeaderboardHtml("<html>changed</html>", "hot"))
      .toThrow("No skills.sh candidates");
  });
});

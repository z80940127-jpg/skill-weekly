import type { Candidate, LeaderboardView } from "./types";

const entryPattern =
  /"source":"([^"]+)","skillId":"([^"]+)","name":"([^"]+)","installs":(\d+),"weeklyInstalls":\[([\d,]*)\](?:,"isOfficial":(true|false))?/g;

export function parseLeaderboardHtml(
  html: string,
  sourceView: LeaderboardView
): Candidate[] {
  const normalized = html.replaceAll('\\"', '"');
  const entries = [...normalized.matchAll(entryPattern)].map((match, index) => ({
    key: `${match[1]}:${match[2]}`,
    source: match[1],
    skillId: match[2],
    name: match[3],
    installs: Number(match[4]),
    weeklyInstalls: match[5] === "" ? [] : match[5].split(",").map(Number),
    isOfficial: match[6] === "true",
    sourceView,
    rank: index + 1,
    skillsUrl: `https://www.skills.sh/${match[1]}/${match[2]}`
  }));

  if (entries.length === 0) {
    throw new Error(`No skills.sh candidates parsed from ${sourceView}.`);
  }

  return entries;
}

export async function fetchCandidates(
  fetcher: typeof fetch = fetch
): Promise<Candidate[]> {
  const views: LeaderboardView[] = ["trending", "hot"];
  const sets = await Promise.all(
    views.map(async (view) => {
      const response = await fetcher(`https://www.skills.sh/${view}`, {
        redirect: "follow"
      });

      if (!response.ok) {
        throw new Error(`skills.sh ${view} returned ${response.status}.`);
      }

      return parseLeaderboardHtml(await response.text(), view);
    })
  );
  const unique = new Map<string, Candidate>();

  for (const candidate of sets.flat()) {
    if (!unique.has(candidate.key)) {
      unique.set(candidate.key, candidate);
    }
  }

  return [...unique.values()];
}

export type LeaderboardView = "trending" | "hot";

export interface Candidate {
  key: string;
  source: string;
  skillId: string;
  name: string;
  installs: number;
  weeklyInstalls?: number[];
  installsYesterday?: number;
  change?: number;
  isOfficial: boolean;
  sourceView: LeaderboardView;
  rank: number;
  skillsUrl: string;
}

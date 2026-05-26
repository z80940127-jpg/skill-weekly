import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { issueSchema, type Issue } from "../../src/lib/issue-schema";
import { assembleIssue } from "./issue-builder";
import { classifyCandidates } from "./curate";
import { fetchEvidence } from "./github";
import { createChineseCopy } from "./models";
import { fetchCandidates } from "./skills-sh";
import type { Candidate } from "./types";
import { persistIssue } from "./write-issue";

const DEFAULT_CANDIDATE_LIMIT = 45;
const MAX_CANDIDATES_PER_REPOSITORY = 3;

interface PublicationOptions {
  issueDirectory: string;
  publishedAt: string;
  token: string;
  candidateLimit?: number;
}

interface PublicationDependencies {
  fetchCandidates: typeof fetchCandidates;
  fetchEvidence: typeof fetchEvidence;
  createChineseCopy: typeof createChineseCopy;
  persistIssue: typeof persistIssue;
}

interface PublicationResult {
  created: boolean;
  issue: Issue;
}

function readExistingIssues(directory: string): Issue[] {
  if (!existsSync(directory)) {
    return [];
  }

  return readdirSync(directory)
    .filter((filename) => /^\d{4}-\d{2}-\d{2}\.json$/.test(filename))
    .map((filename) => {
      const input = JSON.parse(readFileSync(join(directory, filename), "utf8"));
      return issueSchema.parse(input);
    });
}

function selectCandidatesForInspection(candidates: Candidate[], limit: number): Candidate[] {
  if (limit <= 0) {
    return [];
  }

  const selected: Candidate[] = [];
  const perRepository = new Map<string, number>();

  for (const candidate of candidates) {
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(candidate.source)) {
      continue;
    }

    const source = candidate.source.toLowerCase();
    const sourceCount = perRepository.get(source) ?? 0;

    if (sourceCount >= MAX_CANDIDATES_PER_REPOSITORY) {
      continue;
    }

    selected.push(candidate);
    perRepository.set(source, sourceCount + 1);

    if (selected.length === limit) {
      break;
    }
  }

  return selected;
}

export async function runPublication(
  options: PublicationOptions,
  replacements: Partial<PublicationDependencies> = {}
): Promise<PublicationResult> {
  if (!options.token.trim()) {
    throw new Error("GITHUB_TOKEN is required to generate an issue.");
  }

  const dependencies: PublicationDependencies = {
    fetchCandidates,
    fetchEvidence,
    createChineseCopy,
    persistIssue,
    ...replacements
  };
  const existingIssues = readExistingIssues(options.issueDirectory);
  const existingForDate = existingIssues.find((issue) => issue.slug === options.publishedAt);

  if (existingForDate) {
    return { created: false, issue: existingForDate };
  }

  const candidates = selectCandidatesForInspection(
    await dependencies.fetchCandidates(),
    options.candidateLimit ?? DEFAULT_CANDIDATE_LIMIT
  );
  const evidence = [];

  for (const candidate of candidates) {
    try {
      evidence.push(await dependencies.fetchEvidence(candidate, options.token));
    } catch {
      // A candidate without inspectable public evidence cannot be published.
    }
  }

  if (evidence.length === 0) {
    throw new Error("No candidate repositories could be inspected.");
  }

  const previouslyFeatured = new Set(
    existingIssues.flatMap((issue) => issue.featured.map((item) => item.key))
  );
  const classified = classifyCandidates(evidence, previouslyFeatured);
  const featured = classified.featured;
  const stillHot = classified.stillHot.slice(0, 5);
  const watch = classified.watch.slice(0, 5);
  const selected = [...featured, ...stillHot, ...watch];

  if (selected.length === 0) {
    throw new Error("No candidates qualified for publication.");
  }

  const copy = await dependencies.createChineseCopy(selected, options.token);
  const highestIssueNumber = existingIssues.reduce(
    (highest, issue) => Math.max(highest, issue.issueNumber),
    0
  );
  const issue = assembleIssue({
    publishedAt: options.publishedAt,
    issueNumber: highestIssueNumber + 1,
    featured,
    stillHot,
    watch,
    copy
  });

  dependencies.persistIssue(options.issueDirectory, issue);

  return { created: true, issue };
}

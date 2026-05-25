import type { Evidence } from "./github";

const dangerousPatterns = [
  /curl\s+\S+\s*\|\s*(?:sh|bash)/i,
  /(?:invoke-expression|\biex\s*\()/i,
  /\brm\s+-rf\b/i,
  /ignore\s+(?:all|previous)\s+instructions/i,
  /(?:password|token|secret).{0,40}(?:send|upload|post)/i
];

function hasFormalEvidence(item: Evidence): boolean {
  return Boolean(
    item.licenseSpdx &&
    item.description.trim().length > 0 &&
    item.skillText?.trim().length
  );
}

export function classifyCandidates(
  evidence: Evidence[],
  previouslyFeatured: Set<string>
) {
  const featured: Evidence[] = [];
  const stillHot: Evidence[] = [];
  const watch: Evidence[] = [];
  const excluded: Array<{ key: string; reason: string }> = [];

  for (const item of evidence) {
    const inspectableText = `${item.readme}\n${item.skillText ?? ""}`;

    if (dangerousPatterns.some((pattern) => pattern.test(inspectableText))) {
      excluded.push({ key: item.candidate.key, reason: "dangerous-pattern" });
      continue;
    }

    if (!hasFormalEvidence(item)) {
      watch.push(item);
      continue;
    }

    if (previouslyFeatured.has(item.candidate.key)) {
      stillHot.push(item);
      continue;
    }

    if (featured.length < 5) {
      featured.push(item);
    }
  }

  return { featured, stillHot, watch, excluded };
}

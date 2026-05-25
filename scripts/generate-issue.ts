import { resolve } from "node:path";
import { runPublication } from "./lib/run-publication";

function argumentValue(name: string): string | undefined {
  const position = process.argv.indexOf(name);
  return position >= 0 ? process.argv[position + 1] : undefined;
}

function dateInBeijing(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

const publishedAt = argumentValue("--publish-date") ?? dateInBeijing();
const token = process.env.GITHUB_TOKEN ?? "";

if (!/^\d{4}-\d{2}-\d{2}$/.test(publishedAt)) {
  throw new Error("--publish-date must be formatted as YYYY-MM-DD.");
}

const result = await runPublication({
  issueDirectory: resolve("src/data/issues"),
  publishedAt,
  token
});

console.log(result.created
  ? `Published issue ${result.issue.issueNumber} for ${result.issue.slug}.`
  : `Issue for ${result.issue.slug} already exists; no publication created.`);

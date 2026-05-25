import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { issueSchema } from "../../src/lib/issue-schema";

export function persistIssue(directory: string, input: unknown): void {
  const issue = issueSchema.parse(input);
  const target = join(directory, `${issue.slug}.json`);
  const temporary = join(directory, `.${issue.slug}.json.tmp`);

  mkdirSync(directory, { recursive: true });
  writeFileSync(temporary, `${JSON.stringify(issue, null, 2)}\n`, "utf8");
  renameSync(temporary, target);
}

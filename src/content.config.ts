import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { issueSchema } from "./lib/issue-schema";

const issueDirectory = process.env.SKILL_WEEKLY_FIXTURE_BUILD === "1"
  ? "./tests/fixtures/issues"
  : "./src/data/issues";

const issues = defineCollection({
  loader: glob({ pattern: "**/*.json", base: issueDirectory }),
  schema: issueSchema
});

export const collections = { issues };

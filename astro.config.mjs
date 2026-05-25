import { defineConfig } from "astro/config";

const isFixtureBuild = process.env.SKILL_WEEKLY_FIXTURE_BUILD === "1";

export default defineConfig({
  output: "static",
  cacheDir: isFixtureBuild
    ? "./node_modules/.astro-fixture/"
    : "./node_modules/.astro-production/",
});

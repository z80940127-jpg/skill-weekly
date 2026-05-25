import { z } from "zod";

export const skillCardSchema = z.object({
  key: z.string().min(3),
  source: z.string().min(3),
  skillId: z.string().min(1),
  name: z.string().min(1),
  repositoryUrl: z.string().url(),
  sourceUrl: z.string().url(),
  summary: z.string().min(10),
  audience: z.string().min(4),
  compatibility: z.array(z.string().min(1)).min(1),
  reason: z.string().min(8),
  caution: z.string().min(6),
  metrics: z.object({
    installs: z.number().int().nonnegative(),
    weeklyInstalls: z.array(z.number().int().nonnegative())
  })
});

const featuredCardSchema = skillCardSchema.extend({
  status: z.literal("featured")
});
const stillHotCardSchema = skillCardSchema.extend({
  status: z.literal("still-hot")
});
const watchCardSchema = skillCardSchema.extend({
  status: z.literal("watch")
});

export const issueSchema = z.object({
  slug: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  issueNumber: z.number().int().positive(),
  publishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().min(4),
  intro: z.string().min(10),
  shortfallReason: z.string().min(8).nullable(),
  featured: z.array(featuredCardSchema).max(5),
  stillHot: z.array(stillHotCardSchema),
  watch: z.array(watchCardSchema),
  sources: z.array(z.string().url()).min(1)
}).superRefine((issue, context) => {
  const keys = [...issue.featured, ...issue.stillHot, ...issue.watch].map(
    (card) => card.key
  );

  if (new Set(keys).size !== keys.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "A skill can appear only once per issue."
    });
  }

  if (issue.featured.length < 5 && issue.shortfallReason === null) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Fewer than five formal selections requires an explanation."
    });
  }
});

export type Issue = z.infer<typeof issueSchema>;
export type SkillCard = z.infer<typeof skillCardSchema>;

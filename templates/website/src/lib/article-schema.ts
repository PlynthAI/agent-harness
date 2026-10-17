import { z } from "astro/zod"

// Front matter every article must carry. The build fails on an article that breaks it, so a page
// cannot ship without a title, a search-length description or a publication date.
export const articleSchema = z
  .object({
    title: z.string().trim().min(1).max(90),
    description: z.string().trim().min(50).max(160),
    published: z.coerce.date(),
    updated: z.coerce.date().optional(),
    draft: z.boolean().default(false),
  })
  .refine((article) => !article.updated || article.updated >= article.published, {
    message: "updated must not be earlier than published",
    path: ["updated"],
  })

import { getCollection } from "astro:content"

// Published articles, newest first. Drafts stay out of every page and the sitemap.
export async function publishedArticles() {
  const articles = await getCollection("articles", ({ data }) => !data.draft)
  return articles.sort((a, b) => b.data.published.valueOf() - a.data.published.valueOf())
}

export function formatDate(date: Date) {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })
}

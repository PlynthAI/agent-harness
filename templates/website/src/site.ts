// Site-wide facts used by the config, the layouts and the tests. Replace `url` with the real
// origin before the first deploy: canonical links, Open Graph URLs and the sitemap read it.
export const site = {
  name: "__PROJECT_NAME__",
  url: "https://example.com",
  description: "A content website built from static pages, Markdown articles and one small form.",
  locale: "en",
} as const

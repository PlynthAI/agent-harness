import react from "@astrojs/react"
import sitemap from "@astrojs/sitemap"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "astro/config"

import { site } from "./src/site"

export default defineConfig({
  site: site.url,
  output: "static",
  markdown: { syntaxHighlight: false },
  trailingSlash: "always",
  redirects: {
    "/blog/": "/articles/",
  },
  integrations: [react(), sitemap()],
  devToolbar: { enabled: false },
  vite: {
    plugins: [tailwindcss()],
  },
})

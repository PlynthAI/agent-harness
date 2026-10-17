---
title: How to add an article to this site
description: Where an article lives, the front matter it needs, how its address is chosen and what stops a broken article from being published.
published: 2026-10-06
---

Articles are Markdown files in `src/content/articles/`. Each file becomes one page, and the file name becomes its address: `adding-an-article.md` is published at `/articles/adding-an-article/`. Choose the file name with care, because changing it later changes the address and breaks every link that points at the old one.

## The front matter

Every article starts with a short block of front matter between two lines of three dashes:

```md
---
title: How to add an article to this site
description: One or two sentences for search results and link previews.
published: 2026-10-06
---
```

- **title** is the heading and the first part of the browser tab's title. Keep it under 90 characters.
- **description** sits under the heading, in the page's meta description and in link previews. It must be between 50 and 160 characters, the range search engines show without cutting it off.
- **published** is the date the article first appeared, written as `YYYY-MM-DD`.
- **updated** is optional, for the date of a meaningful revision. It cannot be earlier than the publication date.
- **draft** is optional. Set it to `true` to keep an article out of every page and the sitemap while you work on it.

## What the build checks

The front matter is checked against a schema when the site is built. A missing description, a description that is too short or a date that cannot be read stops the build with a message naming the file and the field. That is deliberate: a broken article is caught on your machine rather than by a reader.

## Writing the body

Below the front matter, write in plain Markdown. Use `##` for section headings, since the article's title is already the page's only first-level heading. Keep paragraphs short, link to sources where a claim needs one, and read the page in the browser before publishing it.

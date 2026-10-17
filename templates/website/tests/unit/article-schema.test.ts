import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { articleSchema } from "../../src/lib/article-schema.ts"

const valid = {
  title: "A short title",
  description: "A description long enough to appear in search results without padding.",
  published: "2026-10-08",
}

describe("article front matter", () => {
  it("accepts a complete article and reads the date", () => {
    const article = articleSchema.parse(valid)
    assert.equal(article.published.toISOString(), "2026-10-08T00:00:00.000Z")
    assert.equal(article.draft, false)
  })

  it("rejects a description too short for search results", () => {
    const result = articleSchema.safeParse({ ...valid, description: "Too short." })
    assert.equal(result.success, false)
    assert.deepEqual(
      result.error?.issues.map((issue) => issue.path.join(".")),
      ["description"]
    )
  })

  it("rejects a missing title and an unreadable date", () => {
    const result = articleSchema.safeParse({ ...valid, title: " ", published: "someday" })
    assert.equal(result.success, false)
    const paths = result.error?.issues.map((issue) => issue.path.join(".")).sort()
    assert.deepEqual(paths, ["published", "title"])
  })

  it("rejects an update dated before publication", () => {
    const result = articleSchema.safeParse({ ...valid, updated: "2026-10-01" })
    assert.equal(result.success, false)
    assert.deepEqual(
      result.error?.issues.map((issue) => issue.path.join(".")),
      ["updated"]
    )
  })
})

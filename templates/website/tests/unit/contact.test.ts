import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { submitContact, validateContact } from "../../src/lib/contact.ts"

const valid = {
  name: "Ada",
  email: "ada@example.com",
  message: "Could the articles page show reading times?",
}

describe("contact form rules", () => {
  it("accepts a complete message", () => {
    assert.deepEqual(validateContact(valid), {})
  })

  it("names every missing field", () => {
    assert.deepEqual(Object.keys(validateContact({ name: " ", email: "", message: "" })), [
      "name",
      "email",
      "message",
    ])
  })

  it("rejects a malformed email and a message that is too short", () => {
    const errors = validateContact({ ...valid, email: "ada@example", message: "Hi" })
    assert.match(errors.email ?? "", /email address like/)
    assert.match(errors.message ?? "", /at least 20 characters/)
  })

  it("returns errors without waiting and succeeds after the mocked delay", async () => {
    assert.deepEqual(await submitContact({ ...valid, name: "" }, 0), {
      ok: false,
      errors: { name: "Enter your name." },
    })
    assert.deepEqual(await submitContact({ ...valid, name: " Ada " }, 0), { ok: true, name: "Ada" })
  })
})

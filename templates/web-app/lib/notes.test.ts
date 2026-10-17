import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { NOTE_MAX_LENGTH, noteResponseSchema, saveDraft } from "./notes";

const now = new Date("2026-10-08T09:30:00.000Z");

describe("saveDraft", () => {
  it("trims the text and gives a new note an id and save time", () => {
    const result = saveDraft({ text: "  Book the boiler service  " }, now);
    assert.ok(result.ok);
    assert.equal(result.note.text, "Book the boiler service");
    assert.match(result.note.id, /^[0-9a-f-]{36}$/);
    assert.equal(result.note.savedAt, "2026-10-08T09:30:00.000Z");
  });

  it("keeps the id of a note being edited", () => {
    const id = "6f1c2a4e-9b7d-4c3a-8e2f-1a2b3c4d5e6f";
    const result = saveDraft({ id, text: "Edited" }, now);
    assert.ok(result.ok);
    assert.equal(result.note.id, id);
  });

  it("accepts a note of exactly the maximum length", () => {
    assert.ok(saveDraft({ text: "a".repeat(NOTE_MAX_LENGTH) }, now).ok);
  });

  it("rejects a note over the maximum length with a reason a person can act on", () => {
    const result = saveDraft({ text: "a".repeat(NOTE_MAX_LENGTH + 1) }, now);
    assert.deepEqual(result, { ok: false, message: "Notes are limited to 280 characters." });
  });

  it("rejects a blank note", () => {
    const result = saveDraft({ text: "   " }, now);
    assert.deepEqual(result, { ok: false, message: "Write something before saving." });
  });

  it("rejects a malformed id and a body that is not a draft", () => {
    assert.equal(saveDraft({ id: "42", text: "Hello" }, now).ok, false);
    assert.equal(saveDraft("Hello", now).ok, false);
    assert.equal(saveDraft({ text: 42 }, now).ok, false);
  });
});

describe("noteResponseSchema", () => {
  it("accepts a saved note and an error, and nothing else", () => {
    const saved = saveDraft({ text: "Water the plants" }, now);
    assert.ok(saved.ok);
    assert.ok(noteResponseSchema.safeParse({ note: saved.note }).success);
    assert.ok(noteResponseSchema.safeParse({ error: { message: "No" } }).success);
    assert.equal(noteResponseSchema.safeParse({ note: { text: "No id" } }).success, false);
  });
});

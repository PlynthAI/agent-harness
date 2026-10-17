import { z } from "zod";

// The notes contract shared by the route handler (app/api/notes/route.ts) and the notes page.
// The server is the only place a draft is validated; the page shows the server's message.

export const NOTE_MAX_LENGTH = 280;

export const noteDraftSchema = z.object({
  id: z.uuid("A note id must be a UUID.").optional(),
  text: z
    .string("Write the note as text.")
    .trim()
    .min(1, "Write something before saving.")
    .max(NOTE_MAX_LENGTH, `Notes are limited to ${NOTE_MAX_LENGTH} characters.`),
});

export const noteSchema = z.object({
  id: z.uuid(),
  text: z.string(),
  savedAt: z.iso.datetime(),
});

export const noteResponseSchema = z.union([
  z.object({ note: noteSchema }),
  z.object({ error: z.object({ message: z.string() }) }),
]);

export type NoteDraft = z.input<typeof noteDraftSchema>;
export type Note = z.infer<typeof noteSchema>;
export type NoteResponse = z.infer<typeof noteResponseSchema>;

/** Validate a draft and return the saved note, or the first reason it was rejected. */
export function saveDraft(
  input: unknown,
  now: Date = new Date(),
): { ok: true; note: Note } | { ok: false; message: string } {
  const parsed = noteDraftSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "This note was not valid." };
  }
  return {
    ok: true,
    note: {
      id: parsed.data.id ?? crypto.randomUUID(),
      text: parsed.data.text,
      savedAt: now.toISOString(),
    },
  };
}

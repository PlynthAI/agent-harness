import { saveDraft, type NoteResponse } from "@/lib/notes";

// POST /api/notes validates a note draft ({ text, id? }) and returns the saved note.
// Nothing is stored on the server: the notes page keeps the list in its own state.
export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return reply({ error: { message: "Send the note as a JSON body." } }, 400);
  }

  const result = saveDraft(body);
  if (!result.ok) return reply({ error: { message: result.message } }, 422);
  return reply({ note: result.note }, 201);
}

function reply(body: NoteResponse, status: number): Response {
  return Response.json(body, { status });
}

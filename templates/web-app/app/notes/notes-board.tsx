"use client";

import { cn } from "cn";
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NOTE_MAX_LENGTH, noteResponseSchema, type Note, type NoteDraft } from "@/lib/notes";

type SaveResult = { ok: true; note: Note } | { ok: false; message: string };

// The server is the only validator: the page sends the draft as typed and shows the reason
// the route handler gives. The response is parsed with the shared schema before use.
async function saveNote(draft: NoteDraft): Promise<SaveResult> {
  try {
    const response = await fetch("/api/notes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(draft),
    });
    const body = noteResponseSchema.parse(await response.json());
    return "note" in body
      ? { ok: true, note: body.note }
      : { ok: false, message: body.error.message };
  } catch {
    return { ok: false, message: "The server could not be reached. Try again in a moment." };
  }
}

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });

export function NotesBoard() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const composer = useRef<HTMLInputElement>(null);
  const ids = { field: useId(), count: useId(), error: useId(), heading: useId() };

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    const result = await saveNote({ text: draft });
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      composer.current?.focus();
      return;
    }
    setNotes((current) => [result.note, ...current]);
    setDraft("");
    setError(null);
    setAnnouncement("Note added.");
    composer.current?.focus();
  }

  function replace(note: Note) {
    setNotes((current) => current.map((item) => (item.id === note.id ? note : item)));
    setAnnouncement("Note saved.");
  }

  function remove(id: string) {
    setNotes((current) => current.filter((item) => item.id !== id));
    setAnnouncement("Note removed.");
    composer.current?.focus();
  }

  const over = draft.length > NOTE_MAX_LENGTH;

  return (
    <>
      <form onSubmit={(event) => void add(event)} noValidate aria-busy={saving} className="mt-8">
        <label htmlFor={ids.field} className="t-label-md">
          New note
        </label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <Input
            ref={composer}
            id={ids.field}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setError(null);
            }}
            readOnly={saving}
            autoComplete="off"
            placeholder="For example: renew the parking permit by Friday"
            aria-invalid={error !== null}
            aria-describedby={error ? `${ids.error} ${ids.count}` : ids.count}
          />
          <Button type="submit" disabled={saving} focusableWhenDisabled className="sm:w-32">
            {saving ? "Saving…" : "Add note"}
          </Button>
        </div>
        <div className="mt-2 flex items-start justify-between gap-4">
          {error ? (
            <p id={ids.error} role="alert" className="t-body-sm text-danger-ink">
              Not saved. {error}
            </p>
          ) : (
            <span />
          )}
          <p
            id={ids.count}
            className={cn("t-caption shrink-0 tabular-nums", over && "text-danger-ink")}
          >
            {draft.length} / {NOTE_MAX_LENGTH}
            <span className="sr-only"> characters</span>
          </p>
        </div>
      </form>

      <section aria-labelledby={ids.heading} className="mt-12">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id={ids.heading} className="t-heading-sm">
            Your notes
          </h2>
          <p className="t-label-sm tabular-nums">
            {notes.length === 1 ? "1 note" : `${notes.length} notes`}
          </p>
        </div>

        {notes.length === 0 ? (
          <div className="mt-4 rounded-panel bg-surface-2 px-5 py-10 text-center">
            <p className="t-title">No notes yet</p>
            <p className="t-body-sm mt-1">Add one above and it will appear here.</p>
          </div>
        ) : (
          <ul aria-labelledby={ids.heading} className="mt-4 flex flex-col gap-3">
            {notes.map((note) => (
              <NoteItem
                key={note.id}
                note={note}
                onSaved={replace}
                onRemove={() => remove(note.id)}
              />
            ))}
          </ul>
        )}
      </section>

      <p role="status" className="sr-only">
        {announcement}
      </p>
    </>
  );
}

function NoteItem({
  note,
  onSaved,
  onRemove,
}: {
  note: Note;
  onSaved: (note: Note) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(note.text);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const field = useRef<HTMLInputElement>(null);
  const editButton = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);
  const ids = { text: useId(), field: useId(), error: useId() };

  useEffect(() => {
    if (editing) field.current?.focus();
    else if (returnFocus.current) {
      returnFocus.current = false;
      editButton.current?.focus();
    }
  }, [editing]);

  function finish() {
    returnFocus.current = true;
    setEditing(false);
    setError(null);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    const result = await saveNote({ id: note.id, text });
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      field.current?.focus();
      return;
    }
    onSaved(result.note);
    finish();
  }

  function cancelOnEscape(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Escape") return;
    setText(note.text);
    finish();
  }

  return (
    <li>
      <Card size="sm">
        <CardContent>
          {editing ? (
            <form onSubmit={(event) => void save(event)} noValidate aria-busy={saving}>
              <label htmlFor={ids.field} className="t-label-md">
                Edit note
              </label>
              <Input
                ref={field}
                id={ids.field}
                value={text}
                onChange={(event) => {
                  setText(event.target.value);
                  setError(null);
                }}
                onKeyDown={cancelOnEscape}
                readOnly={saving}
                autoComplete="off"
                aria-invalid={error !== null}
                aria-describedby={error ? ids.error : undefined}
                className="mt-2"
              />
              {error && (
                <p id={ids.error} role="alert" className="t-body-sm mt-2 text-danger-ink">
                  Not saved. {error}
                </p>
              )}
              <div className="mt-3 flex gap-2">
                <Button type="submit" size="sm" disabled={saving} focusableWhenDisabled>
                  {saving ? "Saving…" : "Save"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setText(note.text);
                    finish();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-2">
              <p id={ids.text} className="t-body-md whitespace-pre-wrap text-ink wrap-anywhere">
                {note.text}
              </p>
              <div className="flex items-center justify-between gap-3">
                <p className="t-caption">
                  Saved{" "}
                  <time dateTime={note.savedAt}>{timeFormat.format(new Date(note.savedAt))}</time>
                </p>
                <div className="-mr-3 flex gap-1">
                  <Button
                    ref={editButton}
                    size="sm"
                    variant="ghost"
                    aria-describedby={ids.text}
                    onClick={() => {
                      setText(note.text);
                      setEditing(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" aria-describedby={ids.text} onClick={onRemove}>
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </li>
  );
}

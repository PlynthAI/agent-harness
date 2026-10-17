import type { Metadata } from "next";

import { NotesBoard } from "./notes-board";

export const metadata: Metadata = { title: "Notes" };

export default function NotesPage() {
  return (
    <main className="page-column py-12 md:py-16">
      <h1 className="t-heading-lg">Notes</h1>
      <p className="t-body-md mt-2">
        Write short notes for this session. The server checks each note before it appears. The list
        lives in this tab, so reloading the page clears it.
      </p>
      <NotesBoard />
    </main>
  );
}

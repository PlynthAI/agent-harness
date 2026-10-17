import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { noteResponseSchema } from "@/lib/notes";

import { POST } from "./route";

function post(body: string): Promise<Response> {
  return POST(
    new Request("http://localhost/api/notes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    }),
  );
}

describe("POST /api/notes", () => {
  it("returns 201 with the saved note", async () => {
    const response = await post(JSON.stringify({ text: "Renew the parking permit" }));
    assert.equal(response.status, 201);
    const body = noteResponseSchema.parse(await response.json());
    assert.ok("note" in body);
    assert.equal(body.note.text, "Renew the parking permit");
  });

  it("returns 422 with the reason when the draft is rejected", async () => {
    const response = await post(JSON.stringify({ text: "" }));
    assert.equal(response.status, 422);
    assert.deepEqual(await response.json(), {
      error: { message: "Write something before saving." },
    });
  });

  it("returns 400 when the body is not JSON", async () => {
    const response = await post("not json");
    assert.equal(response.status, 400);
  });
});

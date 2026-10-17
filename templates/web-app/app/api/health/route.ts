// GET /api/health answers when the server can handle requests. scripts/dev.mjs and the
// Playwright web server wait on it.
export function GET(): Response {
  return Response.json({ status: "ok" });
}

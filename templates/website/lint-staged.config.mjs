// Commit hook: check-only, on staged files, with the project's own rules. Nothing here writes:
// format while implementing (`pnpm run format`, or `pnpm exec prettier --write <paths>`), so the
// reviewed change is the committed one. Types, unit tests and knip stay in `pnpm run check`.
// ESLint's type-aware rules need Astro's generated types, so the task runs `astro sync` first,
// as `pnpm run lint` does; it writes only the git-ignored `.astro/` folder. A function task
// runs once with no file arguments appended.
const tasks = {
  "*": "prettier --check --ignore-unknown",
  "*.{ts,tsx,js,mjs,astro}": [() => "astro sync", "eslint --no-warn-ignored"],
  "./DESIGN.md": "designmd lint",
}

export default tasks

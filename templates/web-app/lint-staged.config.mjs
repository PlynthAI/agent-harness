// Commit hook: check-only, on staged files, with the project's own rules. Nothing here writes:
// format while implementing (`pnpm run format`, or `pnpm exec prettier --write <paths>`), so the
// reviewed change is the committed one. Types, unit tests and knip stay in `pnpm run check`.
const tasks = {
  "*": "prettier --check --ignore-unknown",
  "*.{ts,tsx,mts,js,jsx,mjs,cjs}": "eslint --no-warn-ignored",
  "./DESIGN.md": "designmd lint",
};

export default tasks;

// The installed AGENTS.md: the shared AGENTS.md with each numbered section that
// the owner's private overlay, AGENTS.private.md beside it, also has replaced by
// the overlay's version. Without an overlay the shared file installs unchanged.
// config/deploy.ps1, the cloud installer and checks/discovery.ps1 all compose
// through this one function, so the installed text has a single definition.
//
//   node config/compose-agents.mjs <harness-root> <out-file>
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

export const OVERLAY = "AGENTS.private.md"

const SECTION = /^(?=## \d\d )/m
const numberOf = (part) => part.match(/^## (\d\d) /)?.[1]

export function composeAgents(shared, overlay) {
  if (overlay === undefined) return shared
  const replacements = new Map()
  for (const part of overlay.split(SECTION)) {
    const number = numberOf(part)
    if (!number) {
      if (part.trim()) throw new Error(`${OVERLAY} has text outside a numbered section: ${part.trim().slice(0, 60)}`)
      continue
    }
    replacements.set(number, part.endsWith("\n") ? part : `${part}\n`)
  }
  const parts = shared.split(SECTION)
  for (const number of replacements.keys()) {
    if (!parts.some((part) => numberOf(part) === number)) throw new Error(`${OVERLAY} section ${number} has no section to replace in AGENTS.md`)
  }
  return parts.map((part, index) => {
    const replacement = replacements.get(numberOf(part))
    if (!replacement) return part
    // A replaced section keeps the blank line that separated it from the next one.
    return index < parts.length - 1 && !replacement.endsWith("\n\n") ? `${replacement}\n` : replacement
  }).join("")
}

export function composeAgentsAt(root) {
  const overlayPath = path.join(root, OVERLAY)
  return composeAgents(
    readFileSync(path.join(root, "AGENTS.md"), "utf8"),
    existsSync(overlayPath) ? readFileSync(overlayPath, "utf8") : undefined,
  )
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [root, out] = process.argv.slice(2)
  if (!root || !out) {
    console.error("usage: node config/compose-agents.mjs <harness-root> <out-file>")
    process.exit(2)
  }
  mkdirSync(path.dirname(path.resolve(out)), { recursive: true })
  writeFileSync(out, composeAgentsAt(root))
}

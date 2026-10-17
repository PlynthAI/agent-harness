import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

const parts = [
  {
    title: "Application states",
    body: "The notes page shows an empty list, a note being saved, saved notes, a rejected note and long notes.",
  },
  {
    title: "A typed boundary",
    body: "The notes route handler checks every note with zod and answers with typed JSON, which the page checks again before using it.",
  },
  {
    title: "A browser journey",
    body: "A Playwright test adds, edits and removes a note, then sends one the server has to reject.",
  },
  {
    title: "Design tokens",
    body: "Colour, type, radius and focus come from the design library's roles (the Kit by default), in light and dark.",
  },
];

export default function HomePage() {
  return (
    <main className="page-column py-12 md:py-16">
      <p className="t-label-sm">Web app template</p>
      <h1 className="t-display-md mt-3 font-display wrap-anywhere">__PROJECT_NAME__</h1>
      <p className="t-body-lg mt-4">
        A Next.js application with one working slice, so you can see the project&apos;s conventions
        run before you replace it with your own product.
      </p>
      <Link href="/notes" className={buttonVariants({ className: "mt-8" })}>
        Open the notes demo
      </Link>

      <section aria-labelledby="slice-heading" className="mt-16">
        <h2 id="slice-heading" className="t-heading-sm">
          What this slice shows
        </h2>
        <dl className="mt-4 border-t border-line">
          {parts.map((part) => (
            <div
              key={part.title}
              className="grid gap-1 border-b border-line py-4 md:grid-cols-[11rem_1fr] md:gap-6"
            >
              <dt className="t-label-md md:pt-0.5">{part.title}</dt>
              <dd className="t-body-md">{part.body}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}

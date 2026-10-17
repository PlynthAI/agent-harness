"use client";

import { cn } from "cn";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Overview" },
  { href: "/notes", label: "Notes" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b border-line">
      {/* Link fills bleed past the column edges so their text sits on the edges. */}
      <div className="page-column flex min-h-16 items-center justify-between gap-4">
        <Link href="/" className="t-title -mx-2 min-w-0 truncate rounded-control px-2 py-1">
          __PROJECT_NAME__
        </Link>
        <nav aria-label="Main" className="-mr-3">
          <ul className="flex items-center gap-1">
            {links.map((link) => {
              const current = pathname === link.href;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "t-label-md block rounded-control px-3 py-2 text-ink-2 transition-colors duration-(--duration-fast) hover:text-ink",
                      current && "bg-surface-2 text-ink",
                      "focus-visible:bg-focus-fill",
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}

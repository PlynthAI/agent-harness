import "./globals.css";

import type { Metadata } from "next";

import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: {
    default: "__PROJECT_NAME__",
    template: "%s · __PROJECT_NAME__",
  },
  description: "__PROJECT_NAME__",
};

// Follow the operating system's colour scheme unless <html data-theme="..."> is set explicitly.
// Runs before first paint so dark mode never flashes light.
const themeScript = `(() => {
  const root = document.documentElement;
  if (root.dataset.theme) return;
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  const apply = () => { root.dataset.theme = query.matches ? "dark" : "light"; };
  apply();
  query.addEventListener("change", apply);
})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}

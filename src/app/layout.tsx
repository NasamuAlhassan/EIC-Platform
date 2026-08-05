import type { Metadata, Viewport } from "next";
import { Newsreader } from "next/font/google";
import { site } from "@/lib/config";
import "./globals.css";

/*
 * Newsreader, a serif designed for news, used for display only: mastheads,
 * headlines, and standfirsts.
 *
 * Body copy stays on Georgia, which every device already has. That keeps the
 * distinctive face where it is actually seen — the things you notice before
 * you start reading — while the paragraphs you settle into cost nothing and
 * appear instantly.
 *
 * `display: "swap"` means headlines render in Georgia and are replaced when
 * the webfont lands, so a slow connection never waits on a font to see text.
 */
const display = Newsreader({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  // One weight, 48KB. The variable file with its optical-size axis was 248KB —
  // five times as much for range this design never uses, on connections that
  // can least afford it.
  weight: ["600"],
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.boardName} — ${site.schoolName}`,
    template: `%s · ${site.shortName}`,
  },
  description: site.description,
  applicationName: site.boardName,
  keywords: [
    site.boardName,
    site.schoolName,
    "student newspaper",
    "school magazine",
    "editorial board",
    "student publications",
  ],
  openGraph: {
    type: "website",
    siteName: site.boardName,
    title: `${site.boardName} — ${site.schoolName}`,
    description: site.description,
    url: site.url,
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.boardName} — ${site.schoolName}`,
    description: site.description,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf8" },
    { media: "(prefers-color-scheme: dark)", color: "#131418" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={display.variable}>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50
                     focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-brand-ink
                     focus:text-sm focus:font-medium"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}

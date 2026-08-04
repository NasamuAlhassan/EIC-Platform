import type { Metadata, Viewport } from "next";
import { site } from "@/lib/config";
import "./globals.css";

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
    <html lang="en">
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

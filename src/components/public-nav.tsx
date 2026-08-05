"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogIn } from "lucide-react";

import { site } from "@/lib/config";
import { cn } from "@/lib/utils";
import { buttonClass, BoardMark } from "@/components/ui";

const links = [
  { href: "/about", label: "About" },
  { href: "/publications", label: "Publications" },
  { href: "/news", label: "News" },
  { href: "/events", label: "Events" },
  { href: "/gallery", label: "Gallery" },
  { href: "/achievements", label: "Achievements" },
  { href: "/contact", label: "Contact" },
];

/**
 * Deliberately does not read the session. Public pages are statically
 * revalidated so they load fast on a weak connection, and reading auth state
 * here would force every one of them to render per-request. `/login` redirects
 * already-signed-in members to the portal instead.
 */
export function PublicNav() {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  // Close the mobile menu whenever navigation happens.
  React.useEffect(() => setOpen(false), [pathname]);

  // Keep the page from scrolling behind the open mobile menu.
  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-40 masthead-rule bg-paper/92 backdrop-blur-md">
      <nav
        className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6"
        aria-label="Main"
      >
        <Link href="/" className="flex items-center gap-3 shrink-0 group">
          <BoardMark size={38} />
          <span className="flex flex-col leading-none">
            <span className="font-serif text-[19px] font-semibold tracking-[-0.02em] text-ink">
              {site.boardName}
            </span>
            <span className="label mt-1 hidden sm:block">
              {site.schoolName}
            </span>
          </span>
        </Link>

        {/* Small caps and letterspacing: nav as page furniture, not buttons. */}
        <ul className="ml-auto hidden items-center gap-6 lg:flex">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={isActive(l.href) ? "page" : undefined}
                className={cn(
                  "label py-2 transition-colors",
                  isActive(l.href)
                    ? "text-ink border-b-2 border-accent"
                    : "hover:text-ink",
                )}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <Link
            href="/login"
            className={buttonClass("primary", "sm", "hidden rounded-none sm:inline-flex")}
          >
            <LogIn size={15} aria-hidden />
            Members
          </Link>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="grid h-9 w-9 place-items-center rounded-md text-ink-2
                       hover:bg-surface-2 hover:text-ink lg:hidden"
          >
            {open ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </nav>

      {open ? (
        <div
          id="mobile-menu"
          className="border-t border-line bg-paper lg:hidden"
        >
          <ul className="mx-auto max-w-6xl px-4 py-2 sm:px-6">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={cn(
                    "block border-b border-line py-3 text-[15px] last:border-0",
                    isActive(l.href)
                      ? "font-medium text-ink"
                      : "text-ink-2",
                  )}
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li className="py-3 sm:hidden">
              <Link
                href="/login"
                className={buttonClass("primary", "md", "w-full")}
              >
                <LogIn size={15} aria-hidden />
                Members&apos; portal
              </Link>
            </li>
          </ul>
        </div>
      ) : null}
    </header>
  );
}

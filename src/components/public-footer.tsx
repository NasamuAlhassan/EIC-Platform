import Link from "next/link";
import { Mail, Phone, Instagram, Youtube, Facebook } from "lucide-react";

import { site } from "@/lib/config";
import { BoardMark } from "@/components/ui";

const columns = [
  {
    heading: "Read",
    links: [
      { href: "/publications", label: "Publications" },
      { href: "/news", label: "News & announcements" },
      { href: "/achievements", label: "Achievements" },
    ],
  },
  {
    heading: "Take part",
    links: [
      { href: "/events", label: "Upcoming events" },
      { href: "/gallery", label: "Photo gallery" },
      { href: "/contact#join", label: "Join the Board" },
    ],
  },
  {
    heading: "The Board",
    links: [
      { href: "/about", label: "About us" },
      { href: "/contact", label: "Contact" },
      { href: "/login", label: "Members' portal" },
    ],
  },
];

export function PublicFooter() {
  const socials = [
    { key: "instagram", href: site.social.instagram, Icon: Instagram, label: "Instagram" },
    { key: "facebook", href: site.social.facebook, Icon: Facebook, label: "Facebook" },
    { key: "youtube", href: site.social.youtube, Icon: Youtube, label: "YouTube" },
  ].filter((s) => s.href);

  return (
    <footer className="mt-20 border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <div className="flex items-center gap-2.5">
              <BoardMark size={32} />
              <span className="font-serif text-[16px] font-semibold tracking-tight">
                {site.boardName}
              </span>
            </div>
            <p className="mt-3 max-w-xs text-[13.5px] leading-relaxed text-ink-3">
              {site.tagline}
            </p>

            <div className="mt-4 space-y-1.5 text-[13.5px]">
              {site.contact.email ? (
                <a
                  href={`mailto:${site.contact.email}`}
                  className="flex items-center gap-2 text-ink-2 hover:text-brand"
                >
                  <Mail size={14} aria-hidden />
                  {site.contact.email}
                </a>
              ) : null}
              {site.contact.phone ? (
                <a
                  href={`tel:${site.contact.phone}`}
                  className="flex items-center gap-2 text-ink-2 hover:text-brand"
                >
                  <Phone size={14} aria-hidden />
                  {site.contact.phone}
                </a>
              ) : null}
            </div>

            {socials.length > 0 ? (
              <div className="mt-4 flex gap-2">
                {socials.map(({ key, href, Icon, label }) => (
                  <a
                    key={key}
                    href={href}
                    aria-label={label}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="grid h-8 w-8 place-items-center rounded-md border border-line
                               text-ink-2 hover:border-brand hover:text-brand"
                  >
                    <Icon size={15} aria-hidden />
                  </a>
                ))}
              </div>
            ) : null}
          </div>

          {columns.map((col) => (
            <div key={col.heading}>
              <h3 className="font-sans text-[12px] font-semibold uppercase tracking-wider text-ink-3">
                {col.heading}
              </h3>
              <ul className="mt-3 space-y-2">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-[13.5px] text-ink-2 hover:text-brand"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-line pt-6 text-[12.5px] text-ink-3 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {site.boardName}, {site.schoolName}.
          </p>
          {site.foundedYear ? <p>Established {site.foundedYear}.</p> : null}
        </div>
      </div>
    </footer>
  );
}

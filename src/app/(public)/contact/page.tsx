import type { Metadata } from "next";
import { Mail, Phone, MapPin, Users } from "lucide-react";

import { site } from "@/lib/config";
import { Card, CardHeader } from "@/components/ui";
import { ContactForm, JoinForm } from "./forms";

export const metadata: Metadata = {
  title: "Contact & join",
  description: `Get in touch with the ${site.boardName}, or apply to become a member.`,
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <header className="mb-10">
        <p className="text-[12px] font-medium uppercase tracking-wider text-accent">
          Say hello
        </p>
        <h1 className="mt-2.5 font-serif text-[36px] leading-tight tracking-tight sm:text-[42px]">
          Contact the Board
        </h1>
        <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-ink-2">
          Story tip, correction, question, or an application to join — it all
          reaches the same inbox, and an executive will read it.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        <div className="space-y-8">
          <Card>
            <CardHeader
              title="Send a message"
              description="General enquiries, story tips, and corrections."
            />
            <div className="p-5">
              <ContactForm />
            </div>
          </Card>

          <Card id="join" className="scroll-mt-24">
            <CardHeader
              title="Apply to join the Board"
              description="Open to all students. No experience necessary."
            />
            <div className="p-5">
              <JoinForm />
            </div>
          </Card>
        </div>

        <aside className="space-y-5">
          <Card className="p-5">
            <h2 className="font-sans text-[14px] font-semibold">Reach us directly</h2>
            <ul className="mt-3.5 space-y-3 text-[13.5px]">
              {site.contact.email ? (
                <li className="flex items-start gap-2.5">
                  <Mail size={15} className="mt-0.5 shrink-0 text-ink-3" aria-hidden />
                  <a
                    href={`mailto:${site.contact.email}`}
                    className="break-all text-ink-2 hover:text-brand"
                  >
                    {site.contact.email}
                  </a>
                </li>
              ) : null}
              {site.contact.phone ? (
                <li className="flex items-start gap-2.5">
                  <Phone size={15} className="mt-0.5 shrink-0 text-ink-3" aria-hidden />
                  <a
                    href={`tel:${site.contact.phone}`}
                    className="text-ink-2 hover:text-brand"
                  >
                    {site.contact.phone}
                  </a>
                </li>
              ) : null}
              {site.contact.address ? (
                <li className="flex items-start gap-2.5">
                  <MapPin size={15} className="mt-0.5 shrink-0 text-ink-3" aria-hidden />
                  <span className="text-ink-2">{site.contact.address}</span>
                </li>
              ) : null}
              <li className="flex items-start gap-2.5">
                <Users size={15} className="mt-0.5 shrink-0 text-ink-3" aria-hidden />
                <span className="text-ink-2">
                  {site.boardName}, {site.schoolName}
                </span>
              </li>
            </ul>
          </Card>

          <Card className="bg-brand-soft p-5">
            <h2 className="font-sans text-[14px] font-semibold text-brand">
              Already a member?
            </h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">
              Meeting minutes, documents, and the internal calendar live in the
              members&apos; portal.
            </p>
            <a
              href="/login"
              className="mt-3 inline-block text-[13.5px] font-medium text-brand hover:underline"
            >
              Sign in →
            </a>
          </Card>
        </aside>
      </div>
    </div>
  );
}

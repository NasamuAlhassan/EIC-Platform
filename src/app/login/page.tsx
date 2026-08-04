import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { auth } from "@/lib/auth";
import { site } from "@/lib/config";
import { Card, BoardMark } from "@/components/ui";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to the members' portal.",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  const { callbackUrl } = await searchParams;

  const target =
    callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/portal";

  // Already signed in — no reason to show a login form.
  if (session?.user) redirect(target);

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left: the form */}
      <div className="flex flex-col justify-center px-4 py-12 sm:px-10">
        <div className="mx-auto w-full max-w-sm">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[13.5px] text-ink-2 hover:text-brand"
          >
            <ArrowLeft size={15} aria-hidden />
            Back to the website
          </Link>

          <div className="mt-8">
            <BoardMark size={40} className="rounded-lg" />
            <h1 className="mt-5 font-serif text-[30px] leading-tight tracking-tight">
              Members&apos; portal
            </h1>
            <p className="mt-2 text-[14.5px] text-ink-2">
              Sign in to reach the document library, calendar, and announcements.
            </p>
          </div>

          <Card className="mt-7 p-6">
            <LoginForm callbackUrl={target} />
          </Card>

          <p className="mt-6 text-[13px] leading-relaxed text-ink-3">
            Accounts are created by an administrator. If you&apos;ve joined the
            Board and haven&apos;t been given a login yet, or you&apos;ve
            forgotten your password,{" "}
            <Link href="/contact" className="font-medium text-brand hover:underline">
              get in touch
            </Link>
            .
          </p>
        </div>
      </div>

      {/* Right: masthead panel */}
      <div className="relative hidden overflow-hidden border-l border-line bg-brand text-brand-ink lg:block">
        <div className="flex h-full flex-col justify-between p-12">
          <p className="text-[13px] uppercase tracking-[0.18em] opacity-70">
            {site.schoolName}
          </p>

          <div>
            <h2 className="font-serif text-[42px] leading-[1.1]">
              {site.boardName}
            </h2>
            <p className="mt-5 max-w-md text-[16px] leading-relaxed opacity-85">
              {site.tagline}
            </p>
          </div>

          {site.foundedYear ? (
            <p className="text-[13px] opacity-60">
              Established {site.foundedYear}
            </p>
          ) : (
            <span />
          )}
        </div>
      </div>
    </div>
  );
}

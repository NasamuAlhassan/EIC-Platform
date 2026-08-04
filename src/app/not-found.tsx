import Link from "next/link";
import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-4 py-16">
      <div className="max-w-md text-center">
        <p className="font-serif text-[64px] leading-none text-brand-soft">404</p>
        <h1 className="mt-2 font-serif text-[28px] tracking-tight">
          We couldn&apos;t find that page
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          It may have been moved, or the link might be out of date.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/">Back to the homepage</ButtonLink>
          <ButtonLink href="/publications" variant="secondary">
            Browse publications
          </ButtonLink>
        </div>
        <p className="mt-6 text-[13px] text-ink-3">
          Looking for the members&apos; area?{" "}
          <Link href="/login" className="font-medium text-brand hover:underline">
            Sign in
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export type LightboxItem = {
  id: string;
  url: string;
  caption?: string | null;
};

/**
 * Photo grid with a lightbox overlay.
 *
 * Keyboard-driven throughout: arrows move between photos, Escape closes, and
 * focus returns to the thumbnail you opened from.
 */
export function PhotoGrid({ items }: { items: LightboxItem[] }) {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);
  const triggerRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const closeRef = React.useRef<HTMLButtonElement>(null);

  const close = React.useCallback(() => {
    setOpenIndex((current) => {
      if (current !== null) triggerRefs.current[current]?.focus();
      return null;
    });
  }, []);

  const step = React.useCallback(
    (delta: number) => {
      setOpenIndex((current) =>
        current === null
          ? null
          : (current + delta + items.length) % items.length,
      );
    },
    [items.length],
  );

  React.useEffect(() => {
    if (openIndex === null) return;

    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };

    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [openIndex, close, step]);

  const active = openIndex === null ? null : items[openIndex];

  return (
    <>
      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item, i) => (
          <li key={item.id}>
            <button
              ref={(el) => {
                triggerRefs.current[i] = el;
              }}
              type="button"
              onClick={() => setOpenIndex(i)}
              className="group block w-full overflow-hidden rounded-[var(--radius)]
                         border border-line bg-surface-2 focus-visible:outline-2
                         focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
              aria-label={item.caption ?? `Open photo ${i + 1} of ${items.length}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.url}
                alt={item.caption ?? ""}
                loading="lazy"
                className="aspect-square w-full object-cover transition-transform
                           duration-300 group-hover:scale-[1.04]"
              />
            </button>
          </li>
        ))}
      </ul>

      {active ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={active.caption ?? "Photo viewer"}
          className="fixed inset-0 z-50 flex flex-col bg-black/92 backdrop-blur-sm"
          onClick={(e) => {
            // Only a click on the backdrop itself should dismiss.
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="flex items-center justify-between gap-4 px-4 py-3 text-white/80">
            <span className="text-[13px] tabular-nums">
              {(openIndex ?? 0) + 1} / {items.length}
            </span>
            <button
              ref={closeRef}
              type="button"
              onClick={close}
              aria-label="Close"
              className="grid h-9 w-9 place-items-center rounded-md hover:bg-white/10 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          <div className="relative flex flex-1 items-center justify-center px-4 pb-4">
            {items.length > 1 ? (
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Previous photo"
                className="absolute left-3 grid h-11 w-11 place-items-center rounded-full
                           bg-white/10 text-white hover:bg-white/20"
              >
                <ChevronLeft size={22} />
              </button>
            ) : null}

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={active.url}
              alt={active.caption ?? ""}
              className="max-h-full max-w-full rounded-md object-contain"
            />

            {items.length > 1 ? (
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Next photo"
                className="absolute right-3 grid h-11 w-11 place-items-center rounded-full
                           bg-white/10 text-white hover:bg-white/20"
              >
                <ChevronRight size={22} />
              </button>
            ) : null}
          </div>

          {active.caption ? (
            <p className="px-6 pb-6 text-center text-[14px] text-white/80">
              {active.caption}
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

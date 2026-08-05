import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { site } from "@/lib/config";

/* ==========================================================================
   Button
   ========================================================================== */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "accent";
type ButtonSize = "sm" | "md" | "lg";

const buttonBase =
  "inline-flex items-center justify-center gap-2 font-medium rounded-[var(--radius)] " +
  "transition-colors duration-150 whitespace-nowrap " +
  "disabled:opacity-50 disabled:pointer-events-none " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-brand text-brand-ink hover:bg-brand-hover shadow-sm",
  secondary:
    "bg-surface text-ink border border-line-2 hover:bg-surface-2 shadow-sm",
  ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink",
  danger: "bg-danger text-white hover:opacity-90 shadow-sm",
  accent: "bg-accent text-white hover:opacity-90 shadow-sm",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-6 text-[15px]",
};

export function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
) {
  return cn(buttonBase, buttonVariants[variant], buttonSizes[size], className);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button className={buttonClass(variant, size, className)} {...props} />
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

/* ==========================================================================
   Surfaces
   ========================================================================== */

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-surface border border-line rounded-[var(--radius)] shadow-card",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 px-5 py-4 border-b border-line",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold font-sans text-ink tracking-tight">
          {title}
        </h2>
        {description ? (
          <p className="text-[13px] text-ink-3 mt-0.5">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/* ==========================================================================
   Badge
   ========================================================================== */

type BadgeTone =
  | "neutral"
  | "brand"
  | "accent"
  | "ok"
  | "warn"
  | "danger";

const badgeTones: Record<BadgeTone, string> = {
  neutral: "bg-surface-2 text-ink-2 border-line",
  brand: "bg-brand-soft text-brand border-transparent",
  accent: "bg-accent-soft text-accent border-transparent",
  ok: "bg-ok-soft text-ok border-transparent",
  warn: "bg-warn-soft text-warn border-transparent",
  danger: "bg-danger-soft text-danger border-transparent",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5",
        "text-[11px] font-medium tracking-wide uppercase",
        badgeTones[tone],
        className,
      )}
      {...props}
    />
  );
}

/* ==========================================================================
   Form controls
   ========================================================================== */

const controlClass =
  "w-full rounded-[var(--radius)] border border-line-2 bg-surface px-3 text-ink " +
  "placeholder:text-ink-3 shadow-sm transition-colors " +
  "focus:border-brand focus:outline-none focus:ring-2 focus:ring-[var(--brand-soft)] " +
  "disabled:opacity-60 disabled:bg-surface-2";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input className={cn(controlClass, "h-10 text-sm", className)} {...props} />
  );
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(controlClass, "py-2 text-sm min-h-[110px]", className)}
      {...props}
    />
  );
}

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(controlClass, "h-10 text-sm pr-8 appearance-none", className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23767884' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 0.6rem center",
      }}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="block text-[13px] font-medium text-ink"
      >
        {label}
        {required ? <span className="text-accent ml-0.5">*</span> : null}
      </label>
      {children}
      {error ? (
        <p className="text-[12.5px] text-danger">{error}</p>
      ) : hint ? (
        <p className="text-[12.5px] text-ink-3">{hint}</p>
      ) : null}
    </div>
  );
}

export function Checkbox({
  label,
  hint,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
}) {
  const id = React.useId();
  return (
    <div className={cn("flex gap-2.5", className)}>
      <input
        id={props.id ?? id}
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-line-2 accent-[var(--brand)] cursor-pointer"
        {...props}
      />
      <div className="min-w-0">
        <label
          htmlFor={props.id ?? id}
          className="block text-sm text-ink cursor-pointer select-none"
        >
          {label}
        </label>
        {hint ? <p className="text-[12.5px] text-ink-3">{hint}</p> : null}
      </div>
    </div>
  );
}

/* ==========================================================================
   Feedback
   ========================================================================== */

export function Alert({
  tone = "neutral",
  title,
  children,
  className,
}: {
  tone?: BadgeTone;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const tones: Record<BadgeTone, string> = {
    neutral: "bg-surface-2 border-line text-ink-2",
    brand: "bg-brand-soft border-transparent text-brand",
    accent: "bg-accent-soft border-transparent text-accent",
    ok: "bg-ok-soft border-transparent text-ok",
    warn: "bg-warn-soft border-transparent text-warn",
    danger: "bg-danger-soft border-transparent text-danger",
  };
  return (
    <div
      className={cn(
        "rounded-[var(--radius)] border px-4 py-3 text-sm",
        tones[tone],
        className,
      )}
      role={tone === "danger" ? "alert" : undefined}
    >
      {title ? <p className="font-semibold mb-0.5">{title}</p> : null}
      {children ? <div className="leading-relaxed">{children}</div> : null}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center px-6 py-14",
        className,
      )}
    >
      {icon ? (
        <div className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-surface-2 text-ink-3">
          {icon}
        </div>
      ) : null}
      <p className="font-medium text-ink">{title}</p>
      {description ? (
        <p className="text-sm text-ink-3 mt-1 max-w-sm">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/* ==========================================================================
   Avatar
   ========================================================================== */

export function Avatar({
  name,
  src,
  size = 36,
  className,
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const text = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  if (src) {
    return (
      // Uploaded avatars come from user-controlled hosts; a plain <img> keeps
      // this working without extra image-domain configuration.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        className={cn(
          "rounded-full object-cover bg-surface-2 shrink-0",
          className,
        )}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        "grid place-items-center rounded-full bg-brand-soft text-brand font-semibold shrink-0 select-none",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {text}
    </span>
  );
}

/* ==========================================================================
   Layout helpers
   ========================================================================== */

export function PageHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-[28px] font-semibold tracking-tight">
          {title}
        </h1>
        {description ? (
          <p className="text-sm text-ink-2 mt-1.5 max-w-2xl">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] uppercase tracking-wider text-ink-3 font-medium">
            {label}
          </p>
          <p className="text-2xl font-semibold font-sans text-ink mt-1.5 tabular-nums">
            {value}
          </p>
          {hint ? <p className="text-[12.5px] text-ink-3 mt-0.5">{hint}</p> : null}
        </div>
        {icon ? <div className="text-ink-3 shrink-0">{icon}</div> : null}
      </div>
    </Card>
  );
}

/** A horizontal rule with a centred label, used to break up long lists. */
export function Divider({ label }: { label?: string }) {
  if (!label) return <hr className="border-line" />;
  return (
    <div className="flex items-center gap-3">
      <hr className="flex-1 border-line" />
      <span className="text-[11px] uppercase tracking-wider text-ink-3 font-medium">
        {label}
      </span>
      <hr className="flex-1 border-line" />
    </div>
  );
}

/* ==========================================================================
   Logo mark
   ========================================================================== */

/**
 * The Board's mark, used in the nav, footer, portal sidebar, and sign-in page.
 *
 * Renders `site.logo` when one is set, and falls back to a lettered square.
 * Both are always available, so the site never shows a broken image while a
 * logo is being sorted out.
 */
export function BoardMark({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  if (site.logo) {
    return (
      /*
       * Decorative: the Board's name sits next to this everywhere it appears,
       * so announcing the logo too would just repeat it to a screen reader.
       *
       * `object-contain` because a crest is rarely square — letting it stretch
       * to fill would distort it. A plain <img> rather than next/image, since
       * this is a fixed-size local asset and needs no optimisation pipeline.
       */
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={site.logo}
        alt=""
        aria-hidden
        width={size}
        height={size}
        className={cn("shrink-0 object-contain", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  const text = site.monogram;

  // Ratios tuned so 1, 2, and 3 letters all sit comfortably in the square.
  const scale = text.length >= 3 ? 0.3 : text.length === 2 ? 0.4 : 0.47;

  return (
    <span
      aria-hidden
      className={cn(
        "grid place-items-center rounded-md bg-brand font-serif font-bold",
        "text-brand-ink shrink-0 select-none leading-none tracking-tight",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * scale) }}
    >
      {text}
    </span>
  );
}

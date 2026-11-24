import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function Button({
  variant = "ghost",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-opacity disabled:opacity-40",
        variant === "primary" && "bg-accent text-accent-ink hover:opacity-90",
        variant === "ghost" && "border border-line bg-raised text-ink hover:border-accent",
        variant === "danger" && "border border-transparent text-danger hover:bg-raised",
        className,
      )}
      {...props}
    />
  );
}

export const fieldClass =
  "w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus-visible:border-accent";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mb-3 block">
      <span className="mb-1.5 block text-xs text-muted">{label}</span>
      {children}
    </label>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3">
      <span className="text-sm text-ink">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full border transition-colors",
          checked ? "border-accent bg-accent" : "border-line bg-canvas",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-5 rounded-full transition-transform",
            checked ? "translate-x-5 bg-accent-ink" : "translate-x-0.5 bg-muted",
          )}
        />
      </button>
    </div>
  );
}

export function Section({ title, children, open = false }: { title: string; children: ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group border-b border-line">
      <summary className="flex min-h-11 list-none items-center justify-between px-4 text-sm font-medium text-ink">
        {title}
        <ChevronDown className="size-4 text-faint transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}

export function Mark() {
  return (
    <span className="inline-flex items-center gap-2 text-ink">
      <svg viewBox="0 0 32 32" className="size-7 text-accent" aria-hidden="true">
        <circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="16" cy="16" r="2.4" fill="currentColor" />
        <path d="M16 3.5v3.2M16 25.3v3.2M3.5 16h3.2M25.3 16h3.2" stroke="currentColor" strokeWidth="1.6" />
      </svg>
      <span className="font-display text-sm tracking-[0.16em]">SFERA</span>
    </span>
  );
}

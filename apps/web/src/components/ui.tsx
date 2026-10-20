import { clsx } from "clsx";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

export function cx(...values: Array<string | false | null | undefined>) {
  return twMerge(clsx(values));
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={cx("panel p-5", className)}>{children}</section>;
}

export function Button({
  children,
  variant = "default",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "primary" }) {
  return (
    <button
      className={cx("btn", variant === "primary" && "btn-primary", className)}
      {...props}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="label">{label}</span>
      {children}
      {hint ? <span className="block text-[11px] text-muted">{hint}</span> : null}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx("input", props.className)} />;
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "mint" | "danger" | "amber";
}) {
  const tones = {
    neutral: "border-line text-muted",
    mint: "border-mint/40 bg-mint/10 text-mint",
    danger: "border-danger/40 bg-danger/10 text-danger",
    amber: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  };
  return <span className={cx("badge", tones[tone])}>{children}</span>;
}

export function Hash({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="hash">—</span>;
  return (
    <span className="hash" title={value}>
      {value.slice(0, 10)}…{value.slice(-6)}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  if (status === "approved") return <Badge tone="mint">approved</Badge>;
  if (status === "rejected") return <Badge tone="danger">rejected</Badge>;
  if (status === "released") return <Badge tone="amber">released</Badge>;
  return <Badge>registered</Badge>;
}

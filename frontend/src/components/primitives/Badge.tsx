import type { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "accent" | "danger" | "success" | "warning" | "live";
  className?: string;
}

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  const baseStyles =
    "inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-[var(--radius-sm)]";

  const variantStyles: Record<string, string> = {
    default: "bg-[var(--color-muted)]/20 text-[var(--color-muted)]",
    accent: "bg-[var(--color-accent)]/20 text-[var(--color-accent)]",
    danger: "bg-[var(--color-danger)]/20 text-[var(--color-danger)]",
    success: "bg-[var(--color-success)]/20 text-[var(--color-success)]",
    warning: "bg-[var(--color-warning)]/20 text-[var(--color-warning)]",
    live: "bg-[var(--color-danger)] text-white animate-pulse",
  };

  return <span className={`${baseStyles} ${variantStyles[variant]} ${className}`}>{children}</span>;
}

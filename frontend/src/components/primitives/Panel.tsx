import React from "react";

interface PanelProps {
  children: React.ReactNode;
  variant?: "solid" | "glass";
  className?: string;
}

export function Panel({ children, variant = "solid", className = "" }: PanelProps) {
  const baseStyles = "rounded-[var(--radius-md)] border border-[var(--color-stroke)]";

  const variantStyles =
    variant === "glass"
      ? "bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)]"
      : "bg-[var(--color-panel)]";

  return (
    <div
      className={`${baseStyles} ${variantStyles} ${className}`}
      style={{ boxShadow: "var(--shadow-soft)" }}
    >
      {children}
    </div>
  );
}

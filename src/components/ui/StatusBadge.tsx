import type { ReactNode } from "react";

export type StatusBadgeVariant = "safe" | "warning" | "malicious" | "blocked" | "pending";

export function StatusBadge(props: { children: ReactNode; variant?: StatusBadgeVariant; className?: string }) {
  const variant = props.variant ?? "pending";
  return (
    <span className={`status-badge status-badge--${variant} ${props.className ?? ""}`.trim()}>{props.children}</span>
  );
}


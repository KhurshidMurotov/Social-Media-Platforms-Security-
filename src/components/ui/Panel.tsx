import type { ReactNode } from "react";

export function Panel(props: { children: ReactNode; className?: string; as?: "section" | "div" | "article" }) {
  const Tag = props.as ?? "section";
  return <Tag className={`panel panel--cut ${props.className ?? ""}`.trim()}>{props.children}</Tag>;
}

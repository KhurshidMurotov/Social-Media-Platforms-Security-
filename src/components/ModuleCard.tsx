import type { ReactNode } from "react";
import { Panel } from "@/components/ui/Panel";
import { Divider } from "@/components/ui/Divider";

export function ModuleCard(props: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Panel className="card" as="section">
      <div className="card__header">
        <div className="card__meta">MODULE</div>
        <h2 className="card__title">{props.title}</h2>
        <p className="card__desc">{props.description}</p>
      </div>
      <Divider />
      <div className="card__body">{props.children}</div>
    </Panel>
  );
}

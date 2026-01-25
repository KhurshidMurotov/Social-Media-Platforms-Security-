import type { ReactNode } from "react";

export function ModuleCard(props: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="card">
      <div className="card__header">
        <h2 className="card__title">{props.title}</h2>
        <p className="card__desc">{props.description}</p>
      </div>
      <div className="card__body">{props.children}</div>
    </section>
  );
}


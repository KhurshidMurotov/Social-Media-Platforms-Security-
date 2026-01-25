import type { ReactNode } from "react";

export type ResultTone = "neutral" | "good" | "warn" | "bad";

export function ResultBox(props: {
  tone?: ResultTone;
  title?: string;
  children: ReactNode;
}) {
  const tone = props.tone ?? "neutral";
  return (
    <div className={`result result--${tone}`}>
      {props.title ? <div className="result__title">{props.title}</div> : null}
      <div className="result__body">{props.children}</div>
    </div>
  );
}


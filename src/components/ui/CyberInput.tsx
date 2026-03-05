import type { InputHTMLAttributes } from "react";

export function CyberInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`cyber-input ${props.className ?? ""}`.trim()} />;
}


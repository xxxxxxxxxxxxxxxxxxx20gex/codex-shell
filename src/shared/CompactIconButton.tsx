import type { ButtonHTMLAttributes, ReactNode } from "react";
import "./CompactIconButton.css";

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  label: string;
  icon: ReactNode;
}

export function CompactIconButton({ label, icon, className = "", title = label, type = "button", ...props }: Props) {
  return <button {...props} type={type} className={`compact-icon-button ${className}`.trim()} aria-label={label} title={title}>{icon}</button>;
}

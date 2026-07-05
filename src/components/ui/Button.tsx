import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "inverse";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary: "bg-pine-700 text-paper hover:bg-pine-800 border border-pine-700 hover:border-pine-800 shadow-[0_1px_2px_rgb(15_42_32/0.25)]",
  secondary: "bg-panel text-ink border border-line-strong hover:border-pine-600 hover:text-pine-700 hover:bg-pine-50/50",
  ghost: "bg-transparent text-ink-soft border border-transparent hover:bg-pine-50 hover:text-pine-700",
  danger: "bg-transparent text-alert-700 border border-alert-200 hover:bg-alert-100",
  inverse: "bg-paper text-pine-900 border border-paper hover:bg-pine-50 hover:border-pine-50",
};

const SIZE: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-[15px]",
};

const BASE =
  "press inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] font-medium disabled:pointer-events-none disabled:opacity-50";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  to?: string;
  children: ReactNode;
}

export function Button({ variant = "primary", size = "md", to, className = "", children, ...rest }: ButtonProps) {
  const cls = `${BASE} ${VARIANT[variant]} ${SIZE[size]} ${className}`;
  if (to) {
    return (
      <Link to={to} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={cls} {...rest}>
      {children}
    </button>
  );
}

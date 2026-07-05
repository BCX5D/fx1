import { Link } from "react-router-dom";

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--color-pine-700)" />
      <polyline
        points="7,11 11,21 16,13 21,21 25,11"
        fill="none"
        stroke="var(--color-paper)"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24.5" cy="8.3" r="2.2" fill="#D9A441" />
    </svg>
  );
}

export function Logo({ to = "/", light = false }: { to?: string; light?: boolean }) {
  return (
    <Link to={to} className="flex items-center gap-2.5" aria-label="Wirby home">
      <LogoMark />
      <span className={`text-[17px] font-semibold tracking-tight ${light ? "text-paper" : "text-ink"}`}>
        Wirby
      </span>
    </Link>
  );
}

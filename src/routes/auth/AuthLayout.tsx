import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "../../components/ui/Logo";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <div className="flex flex-1 items-center">
          <div className="w-full max-w-sm py-12 lg:mx-auto">{children}</div>
        </div>
        <p className="text-[13px] text-ink-faint">
          Wrong place? <Link to="/" className="text-pine-700 underline hover:no-underline">Back to the site</Link>
        </p>
      </div>
      <div className="hidden bg-pine-950 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div />
        <blockquote className="max-w-md">
          <p className="font-display text-4xl font-medium leading-[1.25] text-paper">
            Calm is not a mood.
            It is a system that knows <em>what is due.</em>
          </p>
        </blockquote>
        <ul className="max-w-md space-y-2.5 border-t border-pine-800 pt-6 text-sm text-pine-200">
          <li>Nothing saves without your confirmation.</li>
          <li>Every important action is logged where you can see it.</li>
          <li>Your data exports in one click, always.</li>
        </ul>
      </div>
    </div>
  );
}

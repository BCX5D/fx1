import { Link } from "react-router-dom";
import { Logo } from "../components/ui/Logo";
import { Button } from "../components/ui/Button";
import { Seo } from "../lib/seo";

export function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col px-6 py-8 sm:px-12">
      <Seo title="Page Not Found — Wirby" description="This page doesn't exist or was moved." path="/404" noindex />
      <Logo />
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <p className="font-mono text-sm text-ink-faint">404</p>
        <h1 className="mt-2 font-display text-4xl font-medium tracking-tight text-ink">
          This page is not on the list.
        </h1>
        <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-ink-soft">
          The link may be old, or the item behind it was deleted.
        </p>
        <div className="mt-8 flex items-center gap-3">
          <Button to="/">Back to the site</Button>
          <Link to="/app" className="text-sm font-medium text-pine-700 underline hover:no-underline">
            Open my dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

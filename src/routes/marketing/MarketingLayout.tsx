import { Link, NavLink, Outlet } from "react-router-dom";
import { Logo, LogoMark } from "../../components/ui/Logo";
import { Button } from "../../components/ui/Button";

export function MarketingLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-[10px] focus:bg-pine-900 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-paper"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur-sm">
        <div className="mx-auto flex h-[68px] w-full max-w-[1200px] items-center justify-between px-5 sm:px-8">
          <Logo />
          <nav aria-label="Site" className="flex items-center gap-1 sm:gap-2">
            <NavLink
              to="/pricing"
              className={({ isActive }) =>
                `press hidden rounded-[10px] px-3 py-2 text-sm font-medium sm:block ${isActive ? "text-pine-700" : "text-ink-soft hover:text-ink"}`
              }
            >
              Pricing
            </NavLink>
            <NavLink
              to="/support"
              className={({ isActive }) =>
                `press hidden rounded-[10px] px-3 py-2 text-sm font-medium sm:block ${isActive ? "text-pine-700" : "text-ink-soft hover:text-ink"}`
              }
            >
              Support
            </NavLink>
            <Link to="/signin" className="press rounded-[10px] px-3 py-2 text-sm font-medium text-ink-soft hover:text-ink">
              Sign in
            </Link>
            <Button to="/signup" size="sm">Start free</Button>
          </nav>
        </div>
      </header>

      <main id="main-content" className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-line bg-panel">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-5 py-12 sm:px-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xs">
            <div className="mb-3 flex items-center gap-2.5">
              <LogoMark size={24} />
              <span className="font-semibold tracking-tight text-ink">Wirby</span>
            </div>
            <p className="text-sm leading-relaxed text-ink-faint">
              A subscription tracker, bill reminder, and renewal tracker in one calm dashboard.
            </p>
          </div>
          <div className="flex flex-wrap gap-12 sm:gap-16">
            <nav aria-label="Product" className="flex flex-col gap-2.5 text-sm">
              <span className="font-medium text-ink">Product</span>
              <Link to="/#what-is-wirby" className="text-ink-faint hover:text-pine-700">What is Wirby</Link>
              <Link to="/pricing" className="text-ink-faint hover:text-pine-700">Pricing</Link>
              <Link to="/support" className="text-ink-faint hover:text-pine-700">Support & FAQ</Link>
              <Link to="/signup" className="text-ink-faint hover:text-pine-700">Start free</Link>
              <Link to="/signin" className="text-ink-faint hover:text-pine-700">Sign in</Link>
            </nav>
            <nav aria-label="Legal" className="flex flex-col gap-2.5 text-sm">
              <span className="font-medium text-ink">Legal</span>
              <Link to="/privacy" className="text-ink-faint hover:text-pine-700">Privacy Policy</Link>
              <Link to="/terms" className="text-ink-faint hover:text-pine-700">Terms of Service</Link>
              <Link to="/refund-policy" className="text-ink-faint hover:text-pine-700">Refund Policy</Link>
            </nav>
            <nav aria-label="Contact" className="flex flex-col gap-2.5 text-sm">
              <span className="font-medium text-ink">Contact</span>
              <a href="mailto:support@wirby.app" className="text-ink-faint hover:text-pine-700">support@wirby.app</a>
            </nav>
            <div className="flex flex-col gap-2.5 text-sm">
              <span className="font-medium text-ink">Principles</span>
              <span className="text-ink-faint">Store less, show more</span>
              <span className="text-ink-faint">Your data exports anytime</span>
              <span className="text-ink-faint">Every action audited</span>
            </div>
          </div>
        </div>
        <div className="border-t border-line">
          <p className="mx-auto w-full max-w-[1200px] px-5 py-4 text-[13px] text-ink-faint sm:px-8">
            © {new Date().getFullYear()} Wirby
          </p>
        </div>
      </footer>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  ClockCounterClockwise, GearSix, House, List, MagnifyingGlass, Plus, SignOut, X,
} from "@phosphor-icons/react";
import { Logo } from "../ui/Logo";
import { useAuth } from "../../state/AuthContext";
import { useDB, useData } from "../../state/DataContext";
import { needsAttention } from "../../lib/urgency";
import { useFocusTrap } from "../../lib/useFocusTrap";

const NAV_MAIN = [
  { to: "/app", label: "Overview", icon: House, end: true },
  { to: "/app/add", label: "Add item", icon: Plus, end: false },
  { to: "/app/search", label: "Search & archive", icon: MagnifyingGlass, end: false },
];

const NAV_SYSTEM = [
  { to: "/app/audit", label: "Audit log", icon: ClockCounterClockwise, end: false },
  { to: "/app/settings", label: "Settings", icon: GearSix, end: false },
];

function NavItems({ attention, onNavigate }: { attention: number; onNavigate?: () => void }) {
  const link = (item: (typeof NAV_MAIN)[number]) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        `press flex items-center gap-3 rounded-[10px] px-3 py-2 text-sm font-medium ${
          isActive ? "bg-pine-100 text-pine-800" : "text-ink-soft hover:bg-pine-50 hover:text-ink"
        }`
      }
    >
      <item.icon size={18} aria-hidden />
      <span className="flex-1">{item.label}</span>
      {item.to === "/app" && attention > 0 && (
        <span className="rounded-full bg-alert-100 px-2 py-0.5 text-[11px] font-semibold text-alert-800">
          {attention}
        </span>
      )}
    </NavLink>
  );
  return (
    <>
      <nav aria-label="Main" className="flex flex-col gap-1">{NAV_MAIN.map(link)}</nav>
      <div className="my-4 border-t border-line" />
      <nav aria-label="System" className="flex flex-col gap-1">{NAV_SYSTEM.map(link)}</nav>
    </>
  );
}

export function AppShell() {
  const { session, signOut } = useAuth();
  const { store } = useData();
  const db = useDB();
  const [menuOpen, setMenuOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const attention = db.items.filter(needsAttention).length;

  // Same overlay accessibility contract as Modal: trap Tab, close on Escape,
  // return focus to the trigger on close.
  useFocusTrap(menuOpen, drawerRef, () => setMenuOpen(false));

  useEffect(() => {
    if (!menuOpen) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const handleSignOut = () => {
    store.log("auth.signout");
    void signOut();
  };

  const userBlock = (
    <div className="mt-auto border-t border-line pt-4">
      <div className="mb-2 px-3">
        <p className="truncate text-sm font-medium text-ink">{session?.name}</p>
        <p className="truncate text-[12px] text-ink-faint">{session?.email}</p>
      </div>
      <button
        type="button"
        onClick={handleSignOut}
        className="press flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-sm font-medium text-ink-soft hover:bg-pine-50 hover:text-ink"
      >
        <SignOut size={18} aria-hidden />
        Sign out
      </button>
    </div>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-[10px] focus:bg-pine-900 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-paper"
      >
        Skip to content
      </a>
      {/* Desktop sidebar */}
      <aside className="hidden border-r border-line bg-panel lg:flex lg:h-dvh lg:sticky lg:top-0 lg:flex-col lg:p-4">
        <div className="mb-8 px-1 pt-1">
          <Logo to="/app" />
        </div>
        <NavItems attention={attention} />
        {userBlock}
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-panel px-4 lg:hidden">
        <Logo to="/app" />
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          className="press rounded-[10px] p-2 text-ink hover:bg-pine-50"
        >
          <List size={22} aria-hidden />
        </button>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            tabIndex={-1}
            className="absolute inset-0 bg-pine-950/40"
            onClick={() => setMenuOpen(false)}
          />
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            tabIndex={-1}
            className="toast-in absolute inset-y-0 right-0 flex w-72 flex-col bg-panel p-4 shadow-(--shadow-float) outline-none"
          >
            <div className="mb-6 flex items-center justify-between">
              <Logo to="/app" />
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="press rounded-[10px] p-2 text-ink-soft hover:bg-pine-50"
              >
                <X size={20} aria-hidden />
              </button>
            </div>
            <NavItems attention={attention} onNavigate={() => setMenuOpen(false)} />
            {userBlock}
          </div>
        </div>
      )}

      <main id="main-content" className="min-w-0">
        <div className="mx-auto w-full max-w-[1080px] px-4 py-8 sm:px-8 lg:py-12">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

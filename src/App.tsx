import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./state/AuthContext";
import { DataProvider, useDB, useData } from "./state/DataContext";
import { ToastProvider } from "./state/ToastContext";
import { MarketingLayout } from "./routes/marketing/MarketingLayout";
import { Home } from "./routes/marketing/Home";
import { Pricing } from "./routes/marketing/Pricing";
import { Privacy } from "./routes/legal/Privacy";
import { Terms } from "./routes/legal/Terms";
import { RefundPolicy } from "./routes/legal/RefundPolicy";
import { SignIn } from "./routes/auth/SignIn";
import { SignUp } from "./routes/auth/SignUp";
import { ForgotPassword } from "./routes/auth/ForgotPassword";
import { ResetPassword } from "./routes/auth/ResetPassword";
import { AppShell } from "./components/app/AppShell";
import { Dashboard } from "./routes/app/Dashboard";
import { AddSource } from "./routes/app/AddSource";
import { ItemDetail } from "./routes/app/ItemDetail";
import { SearchArchive } from "./routes/app/SearchArchive";
import { Settings } from "./routes/app/Settings";
import { AuditLog } from "./routes/app/AuditLog";
import { Onboarding } from "./routes/app/Onboarding";
import { NotFound } from "./routes/NotFound";

function RequireAuth() {
  const { session, resolved } = useAuth();
  const location = useLocation();
  // Wait for the session check to resolve before deciding. In server mode this is a
  // real network verification, so redirecting on unresolved state would be wrong.
  if (!resolved) return <AuthResolving />;
  if (!session) return <Navigate to="/signin" state={{ from: location.pathname }} replace />;
  return (
    <DataProvider>
      <Outlet />
    </DataProvider>
  );
}

/** Neutral hold state while the session is verified. Calm, no spinner theatrics. */
function AuthResolving() {
  return (
    <div className="flex min-h-dvh items-center justify-center" aria-busy="true" aria-live="polite">
      <p className="font-display text-lg text-ink-faint">Checking your session…</p>
    </div>
  );
}

/** Sends first-time users to onboarding, and onboarded users away from it. */
function OnboardingGate({ mode }: { mode: "app" | "onboarding" }) {
  const { ready } = useData();
  const db = useDB();
  if (ready && mode === "app" && !db.onboarded) return <Navigate to="/app/onboarding" replace />;
  if (ready && mode === "onboarding" && db.onboarded) return <Navigate to="/app" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route element={<MarketingLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/refund-policy" element={<RefundPolicy />} />
            </Route>
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/app" element={<RequireAuth />}>
              <Route element={<OnboardingGate mode="onboarding" />}>
                <Route path="onboarding" element={<Onboarding />} />
              </Route>
              <Route element={<OnboardingGate mode="app" />}>
                <Route element={<AppShell />}>
                  <Route index element={<Dashboard />} />
                  <Route path="add" element={<AddSource />} />
                  <Route path="items/:id" element={<ItemDetail />} />
                  <Route path="search" element={<SearchArchive />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="audit" element={<AuditLog />} />
                </Route>
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

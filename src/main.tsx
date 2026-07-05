import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/newsreader/opsz.css";
import "@fontsource-variable/newsreader/opsz-italic.css";
import "@fontsource-variable/instrument-sans";
import "@fontsource-variable/spline-sans-mono";
import "./styles/index.css";
import App from "./App";
import { ErrorBoundary } from "./components/app/ErrorBoundary";

// Privacy-friendly analytics (Plausible), loaded only when a domain is configured.
// No cookies, no personal data, so no consent banner is required.
const plausibleDomain = import.meta.env.VITE_PLAUSIBLE_DOMAIN;
if (plausibleDomain) {
  const s = document.createElement("script");
  s.defer = true;
  s.dataset.domain = plausibleDomain;
  s.src = "https://plausible.io/js/script.js";
  document.head.appendChild(s);
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

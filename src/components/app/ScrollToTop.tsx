import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * React Router doesn't reset scroll position on navigation the way a
 * full-page browser load does -- without this, following a footer link
 * (e.g. Pricing -> Privacy Policy) keeps whatever scroll offset the
 * previous page was left at, so the new page can appear to "load at the
 * bottom." Skips the reset when the navigation carries a hash (e.g.
 * /#faq): those are handled by their own scrollIntoView so they land on
 * the target section instead of the top.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return;
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}

import { useEffect, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/**
 * Shared modal/drawer accessibility behavior so every overlay behaves identically:
 *   - moves focus into the container on open
 *   - traps Tab / Shift+Tab within the container
 *   - closes on Escape
 *   - restores focus to whatever was focused before opening (e.g. the toggle button)
 *
 * Used by both Modal and the mobile navigation drawer.
 */
export function useFocusTrap(
  active: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onClose: () => void,
) {
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusables = () =>
      Array.from(container?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );

    // Move focus in: first focusable element, or the container itself.
    const first = focusables()[0];
    (first ?? container)?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (activeEl === firstItem || activeEl === container)) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && activeEl === lastItem) {
        e.preventDefault();
        firstItem.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      // Restore focus to the trigger so keyboard users are not dumped at the top.
      previouslyFocused?.focus?.();
    };
  }, [active, containerRef, onClose]);
}

import { useLayoutEffect, useId, useRef, useState, type ReactNode } from "react";

/**
 * A single FAQ row: click the question to reveal the answer.
 *
 * Deliberately not a native <details>/<summary> element -- browsers toggle
 * that instantly with no way to animate the reveal. Also deliberately not
 * animating CSS grid-template-rows (0fr -> 1fr): that's a newer CSS feature
 * and iOS Safari's real-device rendering of it is unreliable/janky, even
 * though it looks fine on desktop Chrome. Animating a measured pixel
 * `height` instead is old, boring CSS that every browser (including iPhone
 * Safari) handles smoothly.
 */
export function FaqItem({ q, a }: { q: string; a: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [height, setHeight] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  // Re-measure and apply whenever open changes, and keep tracking the
  // answer's natural height while open (e.g. iPhone rotating to landscape
  // reflows the text to a different number of lines) via ResizeObserver.
  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    if (!open) {
      setHeight(0);
      return;
    }
    setHeight(el.scrollHeight);
    const ro = new ResizeObserver(() => setHeight(el.scrollHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  return (
    <div className="py-5">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full cursor-pointer items-center justify-between gap-4 text-left text-[15px] font-medium text-ink transition-colors hover:text-pine-700"
      >
        {q}
        {/* Two bars that rotate independently: at rest they sit at 0deg/90deg
            (a "+"), and open to 45deg/-45deg -- 90deg apart, so they cross
            into an "x" instead of landing on the same angle and overlapping
            into a single line. Inline transform (not Tailwind's rotate-45
            utility) since -45deg isn't in the default rotate scale. */}
        <span className="relative flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden>
          <span
            className="absolute h-[1.5px] w-3 rounded-full bg-current text-ink-faint transition-transform duration-300 ease-out"
            style={{ transform: `rotate(${open ? 45 : 0}deg)` }}
          />
          <span
            className="absolute h-[1.5px] w-3 rounded-full bg-current text-ink-faint transition-transform duration-300 ease-out"
            style={{ transform: `rotate(${open ? -45 : 90}deg)` }}
          />
        </span>
      </button>
      <div
        id={panelId}
        className="overflow-hidden transition-[height] duration-300 ease-in-out"
        style={{ height }}
      >
        <div ref={contentRef}>
          <p className="max-w-xl pt-3 text-[15px] leading-relaxed text-ink-soft">{a}</p>
        </div>
      </div>
    </div>
  );
}

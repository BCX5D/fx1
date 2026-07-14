import { useId, useState, type ReactNode } from "react";

/**
 * A single FAQ row: click the question to reveal the answer.
 *
 * Deliberately not a native <details>/<summary> element -- browsers toggle
 * that instantly with no way to animate the reveal, which is the "just
 * appears/disappears" behavior this replaces. The grid-template-rows
 * 0fr -> 1fr transition below is a CSS-only way to animate from "no height"
 * to "content height" without JS measuring the content first.
 */
export function FaqItem({ q, a }: { q: string; a: ReactNode }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

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
        className="grid transition-[grid-template-rows] duration-300 ease-in-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <p className="max-w-xl pt-3 text-[15px] leading-relaxed text-ink-soft">{a}</p>
        </div>
      </div>
    </div>
  );
}

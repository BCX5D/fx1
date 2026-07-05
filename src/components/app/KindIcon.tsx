import {
  ArrowsClockwise, FileText, Receipt, SealCheck, Timer, IdentificationCard,
  type Icon,
} from "@phosphor-icons/react";
import type { ItemKind } from "../../lib/types";

const ICONS: Record<ItemKind, Icon> = {
  subscription: ArrowsClockwise,
  bill: Receipt,
  renewal: IdentificationCard,
  deadline: Timer,
  warranty: SealCheck,
  document: FileText,
};

export function KindIcon({ kind, size = 18 }: { kind: ItemKind; size?: number }) {
  const IconCmp = ICONS[kind];
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-pine-50 text-pine-700">
      <IconCmp size={size} aria-hidden />
    </span>
  );
}

import type { LucideIcon } from "lucide-react";
import { CREATE_HREF, MOBILE_BOTTOM_ITEMS } from "@/lib/nav/items";
import { resolveNavIcon } from "@/lib/nav/icon-map";

export interface BottomNavItem {
  readonly href: string;
  readonly label: string;
  readonly icon: LucideIcon;
}

export const MOBILE_NAV: readonly BottomNavItem[] = MOBILE_BOTTOM_ITEMS.map(
  (item) => ({
    href: item.href,
    label: item.label,
    icon: resolveNavIcon(item.icon),
  }),
);

export { CREATE_HREF };
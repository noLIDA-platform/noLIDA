"use client";

import Link from "next/link";
import {
  BarChart3,
  CalendarCheck,
  MessageCircle,
  Package,
  PenLine,
  Wallet,
  Wrench,
} from "lucide-react";
import { Icon } from "@/components/ui/Icon/Icon";
import "./QuickActions.css";

export interface QuickActionsProps {
  /** Carried for context; every action is a navigation, not a mutation. */
  businessId: string;
  className?: string;
}

interface QuickAction {
  label: string;
  href: string;
  icon: typeof Wrench;
  /** True when the destination is a placeholder page until its phase lands. */
  placeholder?: boolean;
}

/**
 * The one row of "do a thing" links above the tabs.
 *
 * Every entry navigates and nothing mutates, so this needs no state and no
 * fetch — but it is still a Client Component because `Icon` pulls in
 * lucide, which the other client primitives already do.
 *
 * The `?new=1` links on Add Service / Add Product open the editor on arrival:
 * an owner who clicks "Add Service" and then has to click "Add service" again
 * has been asked the same question twice. `ServicesClient` and
 * `ProductsClient` read the param and open their create form on mount.
 *
 * Actions whose destination is still a placeholder are shown with a muted
 * style and say so, rather than being hidden. A business owner looking for
 * Bookings should learn that it exists and that it is not ready — silence
 * reads as "this product does not have bookings", which is a different and
 * wrong claim.
 */
const ACTIONS: readonly QuickAction[] = [
  { label: "Create Post", href: "/create", icon: PenLine },
  { label: "Add Service", href: "/my-business/services?new=1", icon: Wrench },
  { label: "Add Product", href: "/my-business/products?new=1", icon: Package },
  { label: "View Bookings", href: "/my-business/bookings", icon: CalendarCheck, placeholder: true },
  { label: "View Messages", href: "/messages", icon: MessageCircle },
  { label: "View Analytics", href: "/my-business/analytics", icon: BarChart3, placeholder: true },
  { label: "Withdraw Earnings", href: "/my-business/earnings", icon: Wallet, placeholder: true },
];

export function QuickActions({
  businessId,
  className,
}: QuickActionsProps): React.JSX.Element {
  const classes = ["biz-quick-actions", className ?? ""].filter(Boolean).join(" ");

  return (
    <div className={classes} aria-label="Quick actions">
      {ACTIONS.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          data-business-id={businessId}
          className={[
            "biz-quick-actions__item",
            action.placeholder ? "biz-quick-actions__item--soon" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <Icon as={action.icon} size={15} />
          <span>{action.label}</span>
          {action.placeholder ? <span className="sr-only"> (coming soon)</span> : null}
        </Link>
      ))}
    </div>
  );
}

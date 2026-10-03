import React from "react";
import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState/EmptyState";
import { Icon } from "@/components/ui/Icon/Icon";
import "./ComingSoonPanel.css";

export interface ComingSoonPanelProps {
  /** A Lucide icon component, the same type `Icon` accepts. */
  icon: LucideIcon;
  title: string;
  /** Must say what will land here, not merely that something will. */
  description: string;
  /** Optional phase reference, e.g. "Reviews land in Phase 17". */
  phase?: string;
}

/**
 * The shared body of every not-yet-built My Business screen (Phase 8C).
 *
 * Eleven tabs — Bookings, Orders, Customers, Messages, Requests, Quotes,
 * Reviews, Earnings, Payouts, Analytics, Promotions — have no backend yet.
 * Writing each as its own page would be eleven copies of the same three
 * elements, and the moment the copy needed a wording fix it would be eleven
 * edits with eleven chances to miss one.
 *
 * So each page passes only its *content* — icon, title, description — and this
 * renders the frame. What matters is the copy: every description names what
 * will actually appear there, so an owner who clicks Bookings learns what
 * bookings are for rather than meeting "coming soon" with no further
 * explanation.
 *
 * The heading is visually hidden and the panel carries an `aria-label`, because
 * "coming soon" panels still have to be navigable by a screen reader — the tab
 * that led here is real, and this is where it goes.
 */
export function ComingSoonPanel({
  icon,
  title,
  description,
  phase,
}: ComingSoonPanelProps): React.JSX.Element {
  return (
    <div className="coming-soon">
      <h1 className="sr-only">{title}</h1>
      <EmptyState
        icon={<Icon as={icon} size={28} />}
        title={title}
        description={description}
      />
      {phase ? <p className="coming-soon__phase">{phase}</p> : null}
    </div>
  );
}

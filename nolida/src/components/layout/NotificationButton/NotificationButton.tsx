import Link from "next/link";
import { Bell } from "lucide-react";
import { Icon } from "@/components/ui/Icon/Icon";
import "./NotificationButton.css";

export interface NotificationButtonProps {
  /**
   * Unread notifications. There is no notifications table yet, so this stays
   * `0` and no badge renders — a permanently-lit bell would train people to
   * ignore it.
   */
  unreadCount?: number;
  className?: string;
}

/**
 * Bell in the top bar, linking to `/notifications`.
 *
 * The count is spoken by the link's accessible name rather than by the badge,
 * which is `aria-hidden` so it cannot be announced twice.
 */
export function NotificationButton({
  unreadCount = 0,
  className,
}: NotificationButtonProps): React.JSX.Element {
  const hasUnread = unreadCount > 0;
  const classes = ["app-icon-button", "app-notification-button", className ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <Link
      href="/notifications"
      className={classes}
      aria-label={
        hasUnread ? `Notifications, ${unreadCount} unread` : "Notifications"
      }
    >
      <Icon as={Bell} size={20} />
      {hasUnread ? (
        <span className="app-notification-button__badge" aria-hidden="true">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}
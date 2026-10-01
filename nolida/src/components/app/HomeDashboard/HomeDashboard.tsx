import Link from "next/link";
import { Receipt, Search, Sparkles, Store, Wallet } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState/EmptyState";
import { Icon } from "@/components/ui/Icon/Icon";
import type { ShellUser } from "@/lib/client/shell-user";
import "./HomeDashboard.css";

const DESTINATIONS = [
  { href: "/discover", label: "Discover", blurb: "Find services near you", icon: Search },
  { href: "/my-business", label: "My business", blurb: "Listings and earnings", icon: Store },
  { href: "/wallet", label: "Wallet", blurb: "Balance and top up", icon: Wallet },
  { href: "/orders", label: "Orders", blurb: "Requests and bookings", icon: Receipt },
] as const;

/**
 * `/home` — the signed-in landing screen.
 *
 * Greets the user by the same name the drawer shows (both come from
 * `toShellUser`), then routes them to the four places they will actually go.
 *
 * There is no feed. The activity panel is one empty state, because posts,
 * orders and messages are later phases — a home screen wired to four tabs must
 * not promise a stream it cannot fill.
 */
export function HomeDashboard({
  user,
  className,
}: {
  user: ShellUser;
  className?: string;
}): React.JSX.Element {
  const classes = ["mp-page", "app-home", className ?? ""].filter(Boolean).join(" ");
  const firstName = user.displayName.trim().split(/\s+/)[0] ?? "there";

  return (
    <div className={classes}>
      <div>
        <p className="mp-eyebrow">Welcome back</p>
        <h1 className="mp-title">Hi, {firstName}</h1>
      </div>

      <ul className="app-home__grid">
        {DESTINATIONS.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="app-home__tile">
              <span className="app-home__tile-icon">
                <Icon as={item.icon} size={20} />
              </span>
              <span className="app-home__tile-text">
                <span className="app-home__tile-label">{item.label}</span>
                <span className="app-home__tile-blurb">{item.blurb}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mp-card">
        <EmptyState
          icon={<Icon as={Sparkles} size={28} />}
          title="Nothing to catch up on yet"
          description="Your activity — requests, messages and orders — appears here as those parts of the app open up."
        />
      </div>
    </div>
  );
}
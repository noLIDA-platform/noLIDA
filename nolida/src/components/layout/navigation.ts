import {
  Bookmark,
  Home,
  LifeBuoy,
  MessageCircle,
  Plus,
  Receipt,
  Search,
  Settings,
  Store,
  User,
  Wallet,
  type LucideIcon,
} from "lucide-react";

/**
 * Every destination in the signed-in app, in one place.
 *
 * The bottom nav, the desktop sidebar and the profile drawer all read from
 * here, so a route can never be added to one and forgotten in another. Icons
 * are the Lucide components themselves, rendered through the `Icon` primitive.
 */
export interface NavItem {
  readonly href: string;
  readonly label: string;
  readonly icon: LucideIcon;
}

export interface NavSection {
  readonly title: string;
  readonly items: readonly NavItem[];
}

/**
 * Bottom navigation, mobile only (<1024px).
 *
 * Five destinations with Create centred — the set the 2026 product plan settled
 * on. Notifications and the cart are deliberately absent: they live in the top
 * bar, and a sixth tab would leave each label too narrow to read.
 */
export const MOBILE_NAV: readonly NavItem[] = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/discover", label: "Discover", icon: Search },
  { href: "/create", label: "Create", icon: Plus },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/profile", label: "Profile", icon: User },
];

/** The centred, emphasised item in the bottom nav. */
export const CREATE_HREF = "/create";

/**
 * Desktop sidebar (≥1024px): the destinations people return to daily.
 * Discovery lives in the desktop top bar instead, so it is not repeated here.
 */
export const SIDEBAR_NAV: readonly NavItem[] = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/my-business", label: "My Business", icon: Store },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/orders", label: "Orders", icon: Receipt },
  { href: "/settings", label: "Settings", icon: Settings },
];

/**
 * Sections inside the profile drawer. Kept separate from `SIDEBAR_NAV` because
 * the drawer is about *the account*, while the sidebar is about *the app*.
 */
export const DRAWER_SECTIONS: readonly NavSection[] = [
  {
    title: "Your account",
    items: [
      { href: "/profile", label: "Profile", icon: User },
      { href: "/favorites", label: "Saved posts", icon: Bookmark },
      { href: "/wallet", label: "Wallet", icon: Wallet },
      { href: "/my-business", label: "My Business", icon: Store },
      { href: "/orders", label: "Orders", icon: Receipt },
    ],
  },
  {
    title: "Support",
    items: [
      { href: "/settings", label: "Settings", icon: Settings },
      { href: "/settings/help", label: "Help", icon: LifeBuoy },
    ],
  },
];
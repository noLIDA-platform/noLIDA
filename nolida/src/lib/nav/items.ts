export interface NavItem {
  label: string;
  href: string;
  icon: string;
  ownerOnly?: boolean;
}

export const SIDEBAR_ITEMS: NavItem[] = [
  { label: "Home", href: "/home", icon: "HomeIcon" },
  { label: "Discover", href: "/discover", icon: "SearchIcon" },
  { label: "Create", href: "/create", icon: "PlusCircleIcon" },
  { label: "Messages", href: "/messages", icon: "MessageIcon" },
  { label: "Notifications", href: "/notifications", icon: "BellIcon" },
  { label: "Wallet", href: "/wallet", icon: "WalletIcon" },
  { label: "Profile", href: "/profile", icon: "UserIcon" },
  { label: "My Business", href: "/my-business", icon: "StoreIcon", ownerOnly: true },
  { label: "Settings", href: "/settings", icon: "SettingsIcon" },
];

export const AVATAR_MENU_SECTIONS: NavItem[][] = [
  [
    { label: "Orders", href: "/orders", icon: "CartIcon" },
    { label: "Bookings", href: "/bookings", icon: "CheckIcon" },
    { label: "Favorites", href: "/favorites", icon: "BookmarkIcon" },
    { label: "Rewards", href: "/rewards", icon: "HeartIcon" },
    { label: "Referrals", href: "/referrals", icon: "ShareIcon" },
  ],
  [
    { label: "List Your Business", href: "/list-your-business", icon: "StoreIcon" },
  ],
  [
    { label: "Help & Support", href: "/help", icon: "AlertIcon" },
    { label: "Privacy & Security", href: "/privacy-security", icon: "SettingsIcon" },
  ],
];

export const MOBILE_DRAWER_SECTIONS: NavItem[][] = [
  [
    { label: "Orders", href: "/orders", icon: "CartIcon" },
    { label: "Bookings", href: "/bookings", icon: "CheckIcon" },
    { label: "Wallet", href: "/wallet", icon: "WalletIcon" },
    { label: "Favorites", href: "/favorites", icon: "BookmarkIcon" },
    { label: "Messages", href: "/messages", icon: "MessageIcon" },
    { label: "Notifications", href: "/notifications", icon: "BellIcon" },
  ],
  [
    { label: "Rewards", href: "/rewards", icon: "HeartIcon" },
    { label: "Referrals", href: "/referrals", icon: "ShareIcon" },
  ],
  [
    { label: "My Business", href: "/my-business", icon: "StoreIcon", ownerOnly: true },
    { label: "List Your Business", href: "/list-your-business", icon: "StoreIcon" },
  ],
  [
    { label: "Settings", href: "/settings", icon: "SettingsIcon" },
    { label: "Help & Support", href: "/help", icon: "AlertIcon" },
    { label: "Privacy & Security", href: "/privacy-security", icon: "SettingsIcon" },
  ],
];

export const MOBILE_BOTTOM_ITEMS: NavItem[] = [
  { label: "Home", href: "/home", icon: "HomeIcon" },
  { label: "Discover", href: "/discover", icon: "SearchIcon" },
  { label: "Create", href: "/create", icon: "PlusCircleIcon" },
  { label: "Messages", href: "/messages", icon: "MessageIcon" },
  { label: "Profile", href: "/profile", icon: "UserIcon" },
];

/**
 * The My Business dashboard's own navigation (Phase 8C).
 *
 * Declared here, beside `SIDEBAR_ITEMS`, because the rule that a destination is
 * listed in exactly one place applies to a tab bar just as much as to a
 * sidebar. `MyBusinessTabs` renders this; it hardcodes nothing.
 *
 * `placeholder: true` is what the tab uses to render the "soon" dot, and it is
 * also the honest label for eleven of these sixteen routes: only Overview,
 * Profile, Posts, Services and Products have real screens behind them today.
 * A tab that quietly shows an empty page is a broken promise; a tab that says
 * "soon" is a roadmap.
 */
export interface BusinessTabItem {
  label: string;
  href: string;
  /** True for routes whose page is an EmptyState placeholder until its phase. */
  placeholder?: boolean;
}

export const MY_BUSINESS_TABS: BusinessTabItem[] = [
  { label: "Overview", href: "/my-business" },
  { label: "Profile", href: "/my-business/profile" },
  { label: "Posts", href: "/my-business/posts" },
  { label: "Services", href: "/my-business/services" },
  { label: "Products", href: "/my-business/products" },
  { label: "Bookings", href: "/my-business/bookings", placeholder: true },
  { label: "Orders", href: "/my-business/orders", placeholder: true },
  { label: "Customers", href: "/my-business/customers", placeholder: true },
  { label: "Messages", href: "/my-business/messages", placeholder: true },
  { label: "Requests", href: "/my-business/requests", placeholder: true },
  { label: "Quotes", href: "/my-business/quotes", placeholder: true },
  { label: "Reviews", href: "/my-business/reviews", placeholder: true },
  { label: "Earnings", href: "/my-business/earnings", placeholder: true },
  { label: "Payouts", href: "/my-business/payouts", placeholder: true },
  { label: "Analytics", href: "/my-business/analytics", placeholder: true },
  { label: "Promotions", href: "/my-business/promotions", placeholder: true },
  { label: "Settings", href: "/my-business/settings" },
];

export const CREATE_HREF = "/create";
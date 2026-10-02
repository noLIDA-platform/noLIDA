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

export const CREATE_HREF = "/create";
import type { LucideIcon } from "lucide-react";
import {
  AlertIcon,
  BellIcon,
  BookmarkIcon,
  CartIcon,
  CheckIcon,
  HeartIcon,
  HomeIcon,
  LogoutIcon,
  MessageIcon,
  PlusCircleIcon,
  RequestIcon,
  SearchIcon,
  SettingsIcon,
  ShareIcon,
  StoreIcon,
  UserIcon,
  WalletIcon,
} from "@/components/ui/Icons";

export const ICON_MAP: Record<string, LucideIcon> = {
  HomeIcon,
  SearchIcon,
  PlusCircleIcon,
  MessageIcon,
  RequestIcon,
  UserIcon,
  BellIcon,
  CartIcon,
  BookmarkIcon,
  WalletIcon,
  StoreIcon,
  LogoutIcon,
  CheckIcon,
  HeartIcon,
  ShareIcon,
  SettingsIcon,
  AlertIcon,
};

export function resolveNavIcon(iconName: string): LucideIcon {
  return ICON_MAP[iconName] ?? AlertIcon;
}
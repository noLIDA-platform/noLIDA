import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { Icon } from "@/components/ui/Icon/Icon";
import "./CartButton.css";

export interface CartButtonProps {
  /**
   * Items in the cart. Carts do not exist yet, so this stays `0` and the badge
   * is omitted — see `NotificationButton` for the same zero-state decision.
   */
  itemCount?: number;
  className?: string;
}

/** Cart in the top bar, linking to `/cart`. */
export function CartButton({
  itemCount = 0,
  className,
}: CartButtonProps): React.JSX.Element {
  const hasItems = itemCount > 0;
  const classes = ["app-icon-button", "app-cart-button", className ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <Link
      href="/cart"
      className={classes}
      aria-label={hasItems ? `Cart, ${itemCount} items` : "Cart"}
    >
      <Icon as={ShoppingCart} size={20} />
      {hasItems ? (
        <span className="app-cart-button__badge" aria-hidden="true">
          {itemCount > 9 ? "9+" : itemCount}
        </span>
      ) : null}
    </Link>
  );
}
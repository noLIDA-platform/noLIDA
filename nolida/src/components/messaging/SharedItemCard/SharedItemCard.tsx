import Link from "next/link";
import { FileTextIcon, StoreIcon } from "@/components/ui/Icons";
import { Icon } from "@/components/ui/Icon/Icon";
import type { SharedItem } from "@/lib/messaging/types";
import "./SharedItemCard.css";

export interface SharedItemCardProps {
  item: SharedItem;
  /** Inside my own bubble the card inverts to sit on the brand surface. */
  mine?: boolean;
  className?: string;
}

const TYPE_ICONS = {
  post: FileTextIcon,
  business: StoreIcon,
  product: StoreIcon,
  request: FileTextIcon,
} as const;

/**
 * A forwarded/shared post, business, product or request inside a bubble.
 *
 * Every display field was derived by the server from the real row (slug,
 * title, image) — the client only ever renders what it is given, and the link
 * is the server-built `href`. A deleted or no-longer-visible item still has a
 * card (the server sent one); the destination 404s honestly if it is gone.
 */
export function SharedItemCard({
  item,
  mine = false,
  className,
}: SharedItemCardProps): React.JSX.Element {
  const icon = TYPE_ICONS[item.type];
  const classes = ["msg-share", mine ? "msg-share--mine" : "", className ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <Link href={item.href} className={classes}>
      {item.imageUrl ? (
        // Server-derived thumbnails come from Cloudinary at arbitrary sizes;
        // next/image optimization adds nothing for a 48px card.
        // eslint-disable-next-line @next/next/no-img-element -- external CDN thumbnail, no benefit from the image optimizer
        <img className="msg-share__image" src={item.imageUrl} alt="" />
      ) : (
        <span className="msg-share__placeholder" aria-hidden="true">
          <Icon as={icon} size={20} />
        </span>
      )}
      <span className="msg-share__text">
        <span className="msg-share__title">{item.title}</span>
        {item.subtitle ? (
          <span className="msg-share__subtitle">{item.subtitle}</span>
        ) : null}
      </span>
    </Link>
  );
}

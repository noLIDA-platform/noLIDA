"use client";

import { Package, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button/Button";
import { Card } from "@/components/ui/Card/Card";
import { Icon } from "@/components/ui/Icon/Icon";
import { formatMinorPrice } from "@/lib/catalog/pricing";
import type { BusinessProduct } from "@/types/catalog";
import "./ProductCard.css";

export interface ProductCardProps {
  product: BusinessProduct;
  onClick?: () => void;
  editable?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ProductCard({
  product,
  onClick,
  editable = false,
  onEdit,
  onDelete,
}: ProductCardProps): React.JSX.Element {
  // `images` is nullable for rows written before uploads existed, so the first
  // entry needs both guards rather than an optional chain alone.
  const firstImage = Array.isArray(product.images) ? product.images[0] : undefined;

  const stockLabel = product.stock == null
    ? "Unlimited stock"
    : product.stock === 0
      ? "Out of stock"
      : `${product.stock} in stock`;

  return (
    <Card as="article" className="catalog-item product-card">
      <div className="product-card__image">
        {firstImage ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={firstImage}
            alt=""
            className="product-card__image-file"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          // Not `aria-hidden` on the wrapper: the placeholder icon is decorative
          // here, but the whole block is a labelled figure by association with the
          // product name below it.
          <span className="product-card__image-placeholder" aria-hidden="true">
            <Icon as={Package} size={28} />
          </span>
        )}
      </div>
      <div className="catalog-item__body product-card__body">
        <div className="catalog-item__heading">
          {onClick ? (
            <button
              type="button"
              className="catalog-item__title-button"
              onClick={onClick}
            >
              {product.name}
            </button>
          ) : (
            <h2 className="catalog-item__title">{product.name}</h2>
          )}
          <p className="catalog-item__price">
            {formatMinorPrice(product.price, product.currency)}
          </p>
        </div>
        {product.description ? (
          <p className="catalog-item__description">{product.description}</p>
        ) : null}
        <span className="catalog-item__badge">{stockLabel}</span>
      </div>
      {editable ? (
        <div className="catalog-item__actions">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="catalog-item__icon-button"
            ariaLabel={`Edit ${product.name}`}
            onClick={(event) => {
              event.stopPropagation();
              onEdit?.();
            }}
          >
            <Icon as={Pencil} size={17} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="catalog-item__icon-button catalog-item__icon-button--danger"
            ariaLabel={`Delete ${product.name}`}
            onClick={(event) => {
              event.stopPropagation();
              onDelete?.();
            }}
          >
            <Icon as={Trash2} size={17} />
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
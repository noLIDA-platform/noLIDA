"use client";

import { Clock3, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button/Button";
import { Card } from "@/components/ui/Card/Card";
import { Icon } from "@/components/ui/Icon/Icon";
import { formatServicePrice } from "@/lib/catalog/pricing";
import type { BusinessService } from "@/types/catalog";
import "./ServiceCard.css";

export interface ServiceCardProps {
  service: BusinessService;
  onClick?: () => void;
  editable?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ServiceCard({
  service,
  onClick,
  editable = false,
  onEdit,
  onDelete,
}: ServiceCardProps): React.JSX.Element {
  return (
    <Card as="article" className="catalog-item">
      <div className="catalog-item__body">
        <div className="catalog-item__heading">
          {onClick ? (
            <button
              type="button"
              className="catalog-item__title-button"
              onClick={onClick}
            >
              {service.name}
            </button>
          ) : (
            <h2 className="catalog-item__title">{service.name}</h2>
          )}
          <p className="catalog-item__price">
            {formatServicePrice(service.price_min, service.price_max, service.currency)}
          </p>
        </div>
        {service.description ? (
          <p className="catalog-item__description">{service.description}</p>
        ) : null}
        {service.duration_minutes ? (
          <span className="catalog-item__badge">
            <Icon as={Clock3} size={15} />
            {service.duration_minutes < 60
              ? `${service.duration_minutes} min`
              : `${Math.floor(service.duration_minutes / 60)} hr${service.duration_minutes >= 120 ? "s" : ""}${service.duration_minutes % 60 ? ` ${service.duration_minutes % 60} min` : ""}`}
          </span>
        ) : null}
      </div>
      {editable ? (
        <div className="catalog-item__actions">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="catalog-item__icon-button"
            ariaLabel={`Edit ${service.name}`}
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
            ariaLabel={`Delete ${service.name}`}
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
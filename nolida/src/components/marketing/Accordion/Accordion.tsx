"use client";

import { useId, useState } from "react";
import { ChevronDownIcon } from "@/components/ui/Icons";
import "./Accordion.css";

export interface AccordionItem {
  readonly question: string;
  readonly answer: string;
}

export interface AccordionProps {
  items: readonly AccordionItem[];
  /** Allow several panels open at once (default: one at a time). */
  allowMultiple?: boolean;
  className?: string;
}

/**
 * Disclosure list built on real buttons: Enter/Space toggle for free, and the
 * trigger exposes aria-expanded + aria-controls against a labelled region.
 */
export function Accordion({
  items,
  allowMultiple = false,
  className,
}: AccordionProps): React.JSX.Element {
  const baseId = useId();
  const [openIndexes, setOpenIndexes] = useState<readonly number[]>([]);

  const toggle = (index: number): void => {
    setOpenIndexes((previous) => {
      const isOpen = previous.includes(index);
      if (allowMultiple) {
        return isOpen
          ? previous.filter((value) => value !== index)
          : [...previous, index];
      }
      return isOpen ? [] : [index];
    });
  };

  const classes = ["mk-accordion", className ?? ""].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      {items.map((item, index) => {
        const isOpen = openIndexes.includes(index);
        const triggerId = `${baseId}-trigger-${index}`;
        const panelId = `${baseId}-panel-${index}`;

        return (
          <div key={item.question} className="mk-accordion__item">
            <h3 className="mk-accordion__heading">
              <button
                type="button"
                id={triggerId}
                className="mk-accordion__trigger"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(index)}
              >
                <span className="mk-accordion__question">{item.question}</span>
                <ChevronDownIcon
                  size={20}
                  className={`mk-accordion__chevron${isOpen ? " mk-accordion__chevron--open" : ""}`}
                />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={triggerId}
              className="mk-accordion__panel"
              hidden={!isOpen}
            >
              <p className="mk-accordion__answer">{item.answer}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default Accordion;

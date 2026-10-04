import Image from "next/image";
import "./FannedStack.css";

export type FannedStackSize = "default" | "compact";

export interface FannedStackProps {
  /** `compact` tightens the fan and shrinks the whole stack. */
  size?: FannedStackSize;
  className?: string;
}

interface FannedCard {
  /** Index in the fan, 0 (far left) to 3 (far right). */
  readonly index: number;
  /** Resting rotation in degrees, before the size scale is applied. */
  readonly rotate: number;
  /** Vertical lift as a percentage of the card's own height. */
  readonly lift: number;
  readonly src: string;
}

/**
 * The four NOlida product screenshots, fanned out like a hand of cards.
 *
 * Geometry lives in CSS: each card gets `--fan-index`, `--fan-rotate` and
 * `--fan-lift`, and the stylesheet derives `left` from the index against the
 * remaining width, so changing `--fanned-card-w` re-lays out the fan without
 * touching this file.
 *
 * Server Component — the fan is entirely CSS-driven, including its entrance
 * animation, so there is no interactivity that would justify "use client".
 *
 * The whole stack is decorative: it repeats information the copy beside it
 * already conveys, so it is hidden from assistive technology and every image
 * carries an empty `alt`.
 */
const CARDS: readonly FannedCard[] = [
  { index: 0, rotate: -13, lift: -3, src: "/images/login-1.png" },
  { index: 1, rotate: -4.5, lift: 0, src: "/images/login-2.png" },
  { index: 2, rotate: 4.5, lift: 0, src: "/images/login-3.png" },
  { index: 3, rotate: 13, lift: -3, src: "/images/login-4.png" },
];

/**
 * Inline custom properties need a widened type. Declaring the keys keeps this
 * type-checked rather than casting the whole style object to `any`.
 */
type FannedCardStyle = React.CSSProperties & {
  "--fan-index": string;
  "--fan-rotate": string;
  "--fan-lift": string;
  "--fan-z": string;
  "--fan-delay": string;
};

export function FannedStack({
  size = "default",
  className,
}: FannedStackProps): React.JSX.Element {
  const classes = [
    "fanned-stack",
    `fanned-stack--${size}`,
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} aria-hidden="true">
      {CARDS.map((card) => {
        const style: FannedCardStyle = {
          "--fan-index": String(card.index),
          "--fan-rotate": String(card.rotate),
          "--fan-lift": String(card.lift),
          // Later cards paint on top, which is what makes it read as a deck
          // fanning to the right.
          "--fan-z": String(card.index + 1),
          "--fan-delay": `${card.index * 90}ms`,
        };

        return (
          <span
            key={card.src}
            className="fanned-stack__card"
            style={style}
          >
            <Image
              src={card.src}
              alt=""
              width={1664}
              height={928}
              sizes="(max-width: 1023px) 30vw, 480px"
              quality={92}
              className="fanned-stack__image"
            />
          </span>
        );
      })}
    </div>
  );
}

export default FannedStack;

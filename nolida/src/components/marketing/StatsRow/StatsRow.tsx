import "./StatsRow.css";

export interface Stat {
  readonly value: string;
  readonly label: string;
}

export interface StatsRowProps {
  stats: readonly Stat[];
  className?: string;
}

/** Centred stat row. Values use the brand gradient; labels stay muted. */
export function StatsRow({ stats, className }: StatsRowProps): React.JSX.Element {
  const classes = ["mk-stats", className ?? ""].filter(Boolean).join(" ");

  return (
    <dl className={classes}>
      {stats.map((stat) => (
        <div key={stat.label} className="mk-stats__item">
          <dt className="mk-stats__label">{stat.label}</dt>
          <dd className="mk-stats__value">{stat.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default StatsRow;

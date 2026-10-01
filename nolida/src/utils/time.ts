/**
 * A short, human "how long ago" for a timestamp.
 *
 * Coarse on purpose. A feed does not need "1 minute 12 seconds ago"; it needs
 * the reader to know at a glance whether this is new. Anything older than a
 * week switches to a date, because "63d" stops meaning anything and "Aug 12"
 * starts.
 *
 * Accepts the ISO strings `pg` returns (see `src/lib/feed/types.ts`) as well as
 * a `Date`, so no call site has to remember to convert.
 */
export function formatTimeAgo(date: string | Date): string {
  const then = typeof date === "string" ? new Date(date) : date;

  // A malformed timestamp should not render "NaN" at someone. An empty string
  // is the honest answer.
  if (Number.isNaN(then.getTime())) return "";

  const seconds = Math.floor((Date.now() - then.getTime()) / 1000);

  // Clock skew, or a row written a moment in the future, reads as "just now"
  // rather than a negative age.
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;

  return then.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
/**
 * The feed's pagination cursor.
 *
 * A cursor is a pair — `(created_at, id)` — flattened to an opaque string and
 * handed to the client, which only ever echoes it back. Two posts can share a
 * timestamp, so the id is what makes the ordering total; without it a page
 * boundary can skip or repeat a row.
 *
 * Shared by every paginated repository so all feeds speak one cursor language.
 */

/** Builds the opaque cursor the feed hands back to the client. */
export function encodeCursor(row: { created_at: string; id: string }): string {
  return `${new Date(row.created_at).toISOString()}|${row.id}`;
}

/**
 * Splits a cursor back into its two parts.
 *
 * A cursor arrives from a query string, so it is not trusted: anything
 * malformed means "start from the top" rather than a crash.
 */
export function decodeCursor(
  cursor: string | null | undefined
): { createdAt: string; id: string } | null {
  if (!cursor) return null;

  const separator = cursor.indexOf("|");
  if (separator <= 0) return null;

  const rawDate = cursor.slice(0, separator);
  const id = cursor.slice(separator + 1);
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime()) || id.length === 0) return null;

  return { createdAt: parsed.toISOString(), id };
}
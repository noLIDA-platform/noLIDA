/**
 * Availability UI types — client-safe.
 *
 * No component may import from `src/lib/server/`. These types describe the
 * shapes the AvailabilityEditor renders and the availability API returns.
 */

/** One weekly availability window row from the database. */
export interface AvailabilitySlot {
  id: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_minutes: number;
  is_active: boolean;
}

/** Human-readable day labels, indexed by day_of_week (0 = Sunday). */
export const DAY_LABELS: Record<number, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

/** The days shown in the weekly editor, in calendar order. */
export const DAY_ORDER: number[] = [1, 2, 3, 4, 5, 6, 0];
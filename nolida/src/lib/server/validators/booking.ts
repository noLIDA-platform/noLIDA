import { z } from "zod";
import { MAX_NOTES_LEN } from "@/lib/bookings/constants";

export const bookingCreateSchema = z.object({
  responseId: z.string().uuid(),
  scheduledAt: z.string().datetime().optional().nullable(),
  notes: z.string().max(MAX_NOTES_LEN).optional().nullable(),
});

export type BookingCreateInput = z.infer<typeof bookingCreateSchema>;

export const bookingRescheduleSchema = z.object({
  scheduledAt: z.string().datetime(),
});

export type BookingRescheduleInput = z.infer<typeof bookingRescheduleSchema>;

export const bookingNoShowSchema = z.object({});

export type BookingNoShowInput = z.infer<typeof bookingNoShowSchema>;

/**
 * Client-side conversation realtime (Phase 10).
 *
 * Joins one Supabase broadcast channel per open thread and reports events
 * ("message", "typing", "read") to the caller, which then refetches through
 * the ordinary API — the channel never carries data that skips a permission
 * check.
 *
 * OPTIONAL BY CONSTRUCTION: without NEXT_PUBLIC_SUPABASE_URL and
 * NEXT_PUBLIC_SUPABASE_ANON_KEY this returns null and the chat works
 * unchanged on its 5-second poll. Nothing in the messaging UI may branch on
 * realtime being present beyond reacting FASTER when it is.
 */

export interface ConversationRealtimeHandle {
  close(): void;
}

export interface ConversationRealtimeHandlers {
  onEvent: (event: string, payload: Record<string, unknown>) => void;
  /** Called when the channel errors or times out; the poll stays the floor. */
  onError?: () => void;
}

export function conversationRealtimeAvailable(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
}

export async function subscribeConversation(
  conversationId: string,
  handlers: ConversationRealtimeHandlers
): Promise<ConversationRealtimeHandle | null> {
  if (!conversationRealtimeAvailable()) return null;

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim();
    const client = createClient(url, anon);
    const channel = client.channel(`conversation:${conversationId}`, {
      config: { broadcast: { self: false } },
    });
    channel.on("broadcast", { event: "*" }, (message) => {
      handlers.onEvent(
        message.event,
        (message.payload ?? {}) as Record<string, unknown>
      );
    });
    await channel.subscribe((status) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        handlers.onError?.();
      }
    });
    return {
      close: () => {
        void client.removeChannel(channel);
      },
    };
  } catch {
    return null;
  }
}

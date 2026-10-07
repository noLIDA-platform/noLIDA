import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side conversation broadcasts (Phase 10).
 *
 * Supabase Realtime is an OPTIMISATION here, never a dependency: without
 * SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY this module is a no-op and the
 * app behaves exactly as it does without realtime — the client polls. When
 * the env vars exist, a broadcast on `conversation:{id}` lets the other
 * person's open thread refresh instantly instead of waiting for the next
 * poll tick.
 *
 * Broadcast channels carry no Postgres publication and no RLS question:
 * they are ephemeral pub/sub, and a subscriber only learns about events for
 * a channel whose id they already know. The server never routes a payload
 * to a user — the client, having joined the channel, refetches through the
 * ordinary API where every membership check still applies.
 *
 * A failed whisper is logged and swallowed. A message that was written
 * successfully must never 500 because a notification did not arrive.
 */

let clientPromise: Promise<SupabaseClient | null> | null = null;

function getClient(): Promise<SupabaseClient | null> {
  if (!clientPromise) {
    clientPromise = (async () => {
      const url = process.env.SUPABASE_URL?.trim();
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
      if (!url || !key) return null;
      const { createClient } = await import("@supabase/supabase-js");
      return createClient(url, key, {
        realtime: { params: { eventsPerSecond: 5 } },
      });
    })();
  }
  return clientPromise;
}

const channels = new Map<string, RealtimeChannel>();
const MAX_CHANNELS = 64;

async function getChannel(
  conversationId: string
): Promise<{ channel: RealtimeChannel; client: SupabaseClient } | null> {
  const existing = channels.get(conversationId);
  const client = await getClient();
  if (!client) return null;
  if (existing) return { channel: existing, client };

  // Bounded cache: a long-lived server that has seen many conversations must
  // not accumulate a channel per id forever.
  if (channels.size >= MAX_CHANNELS) {
    const oldest = channels.keys().next().value;
    if (oldest) {
      const stale = channels.get(oldest);
      channels.delete(oldest);
      if (stale) void client.removeChannel(stale);
    }
  }

  const channel = client.channel(`conversation:${conversationId}`, {
    config: { broadcast: { self: false } },
  });
  await new Promise<void>((resolve) => {
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        resolve();
      }
    });
  });
  channels.set(conversationId, channel);
  return { channel, client };
}

export async function publishConversationEvent(
  conversationId: string,
  event: string,
  payload: unknown
): Promise<void> {
  try {
    const result = await getChannel(conversationId);
    if (!result) return;
    await result.channel.send({ type: "broadcast", event, payload });
  } catch (error) {
    console.error("[realtime] publish failed:", error);
  }
}

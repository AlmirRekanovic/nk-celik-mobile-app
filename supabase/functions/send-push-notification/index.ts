import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type NotificationType = "news" | "poll";

interface PushNotificationRequest {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  type: NotificationType;
}

interface PushTokenRow {
  token: string;
  platform: string;
}

const json = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { title, body, data, type }: PushNotificationRequest = await req.json();

    if (!title || !body || !type) {
      return json(400, { error: "Missing required fields: title, body, type" });
    }

    if (type !== "news" && type !== "poll") {
      return json(400, { error: "type must be 'news' or 'poll'" });
    }

    const categoryColumn = type === "news" ? "news_enabled" : "polls_enabled";

    const { data: tokens, error: tokensError } = await supabase
      .from("push_tokens")
      .select("token, platform")
      .eq("enabled", true)
      .eq(categoryColumn, true);

    if (tokensError) {
      throw tokensError;
    }

    if (!tokens || tokens.length === 0) {
      return json(200, { message: "No active push tokens for this category", sentCount: 0 });
    }

    const messages = (tokens as PushTokenRow[]).map((tokenData) => ({
      to: tokenData.token,
      sound: "default",
      title,
      body,
      data: { ...data, type },
    }));

    const chunks: typeof messages[] = [];
    for (let i = 0; i < messages.length; i += 100) {
      chunks.push(messages.slice(i, i + 100));
    }

    const results: unknown[] = [];
    const invalidTokens: string[] = [];

    for (const chunk of chunks) {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chunk),
      });

      if (!response.ok) {
        console.error("Error sending push notifications:", await response.text());
        continue;
      }

      const result = await response.json();
      results.push(result);

      const tickets = (result?.data ?? []) as Array<{
        status?: string;
        details?: { error?: string };
      }>;
      tickets.forEach((ticket, idx) => {
        const offendingToken = chunk[idx]?.to;
        if (
          ticket?.status === "error" &&
          (ticket.details?.error === "DeviceNotRegistered" ||
            ticket.details?.error === "InvalidCredentials") &&
          offendingToken
        ) {
          invalidTokens.push(offendingToken);
        }
      });
    }

    if (invalidTokens.length > 0) {
      const { error: cleanupError } = await supabase
        .from("push_tokens")
        .delete()
        .in("token", invalidTokens);
      if (cleanupError) {
        console.error("Failed to delete invalid tokens:", cleanupError);
      }
    }

    return json(200, {
      message: "Push notifications dispatched",
      sentCount: messages.length,
      invalidCount: invalidTokens.length,
      results,
    });
  } catch (error) {
    console.error("Error in send-push-notification:", error);
    return json(500, {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PushNotificationRequest {
  title: string;
  body: string;
  data?: Record<string, any>;
  type: "news" | "poll";
}

interface PushToken {
  token: string;
  platform: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { title, body, data, type }: PushNotificationRequest = await req.json();

    if (!title || !body || !type) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: title, body, type" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Filter by per-type preference columns (news_enabled / polls_enabled)
    const typeFilter = type === "news" ? "news_enabled" : "polls_enabled";

    const { data: tokens, error: tokensError } = await supabase
      .from("push_tokens")
      .select("token, platform")
      .eq("enabled", true)
      .eq(typeFilter, true);

    if (tokensError) {
      throw tokensError;
    }

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active push tokens found" }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const messages = (tokens as PushToken[]).map((tokenData) => ({
      to: tokenData.token,
      sound: "default",
      title,
      body,
      data: {
        ...data,
        type,
      },
    }));

    const CHUNK_SIZE = 100;
    const chunks: Array<Array<{ to: string }>> = [];
    for (let i = 0; i < messages.length; i += CHUNK_SIZE) {
      chunks.push(messages.slice(i, i + CHUNK_SIZE) as Array<{ to: string }>);
    }

    const results = [];
    const deadTokens: string[] = [];
    const DEAD_TOKEN_ERRORS = new Set([
      "DeviceNotRegistered",
      "InvalidCredentials",
    ]);

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

      // Expo Push API returns { data: [ticket, ticket, ...] } — order matches
      // the chunk we sent. Tickets with status="error" and a "DeviceNotRegistered"
      // or "InvalidCredentials" detail mean the token is permanently dead:
      // uninstalled app, revoked permission, expired Expo project. Delete them so
      // future notifications don't waste an API slot.
      const tickets = Array.isArray(result?.data) ? result.data : [];
      tickets.forEach((ticket: any, idx: number) => {
        if (
          ticket?.status === "error" &&
          DEAD_TOKEN_ERRORS.has(ticket?.details?.error)
        ) {
          const token = chunk[idx]?.to;
          if (token) deadTokens.push(token);
        }
      });
    }

    if (deadTokens.length > 0) {
      const { error: deleteError } = await supabase
        .from("push_tokens")
        .delete()
        .in("token", deadTokens);

      if (deleteError) {
        console.error("Failed to prune dead tokens:", deleteError);
      } else {
        console.log(`Pruned ${deadTokens.length} dead push tokens`);
      }
    }

    return new Response(
      JSON.stringify({
        message: "Push notifications sent successfully",
        sentCount: messages.length,
        prunedCount: deadTokens.length,
        results,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in send-push-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

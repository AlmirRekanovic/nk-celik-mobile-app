import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyJwt } from "../_shared/jwt.ts";

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

    // Only the service role (news-poller cron) or an admin member may
    // broadcast. Anything else — anon key included — is rejected.
    const jwtSecret = Deno.env.get("JWT_SECRET") ?? Deno.env.get("SUPABASE_JWT_SECRET");
    if (!jwtSecret) {
      console.error("[send-push] JWT_SECRET is not configured");
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    const claims = await verifyJwt(bearer, jwtSecret);
    let authorized = claims?.role === "service_role";

    if (!authorized && claims?.sub) {
      const { data: caller } = await supabase
        .from("members")
        .select("is_admin")
        .eq("id", claims.sub)
        .maybeSingle();
      authorized = caller?.is_admin === true;
    }

    if (!authorized) {
      console.warn("[send-push] rejected unauthorized caller");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { title, body, data, type }: PushNotificationRequest = await req.json();

    console.log(`[send-push] request: type=${type}, title="${title}"`);

    if (!title || !body || !type) {
      console.warn("[send-push] rejecting: missing required fields");
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
      console.error("[send-push] token query failed:", tokensError);
      throw tokensError;
    }

    console.log(`[send-push] tokens found matching (enabled=true, ${typeFilter}=true): ${tokens?.length ?? 0}`);

    if (!tokens || tokens.length === 0) {
      console.log("[send-push] no eligible tokens — returning 200 with no-op");
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

    console.log(`[send-push] done: sent=${messages.length}, pruned=${deadTokens.length}`);

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

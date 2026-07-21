const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface NormalizedPost {
  id: number;
  title: string;
  excerpt: string;
  status: string;
  type: string;
}

// WordPress can send us two very different payload shapes:
//   1. WP REST API shape (theme snippet path): { id, title:{rendered}, excerpt:{rendered}, status, type }
//   2. WP Webhooks plugin shape: { post_id, post: { ID, post_title, post_excerpt, post_status, post_type } }
// Normalize both into a single internal shape so the rest of the function
// doesn't have to care which sender fired the request.
function normalizePayload(raw: any): NormalizedPost | null {
  if (!raw || typeof raw !== "object") return null;

  // Plugin shape: { post: { ID, post_title, ... } } or nested under `data`
  const pluginPost = raw.post ?? raw.data?.post;
  if (pluginPost && (pluginPost.ID !== undefined || pluginPost.post_title !== undefined)) {
    return {
      id: Number(pluginPost.ID ?? raw.post_id ?? 0),
      title: String(pluginPost.post_title ?? ""),
      excerpt: String(pluginPost.post_excerpt ?? pluginPost.post_content ?? ""),
      status: String(pluginPost.post_status ?? "publish"),
      type: String(pluginPost.post_type ?? "post"),
    };
  }

  // Some plugin configs flatten it: { post_id, post_title, post_status, ... } at top level
  if (raw.post_id !== undefined && raw.post_title !== undefined) {
    return {
      id: Number(raw.post_id),
      title: String(raw.post_title ?? ""),
      excerpt: String(raw.post_excerpt ?? raw.post_content ?? ""),
      status: String(raw.post_status ?? "publish"),
      type: String(raw.post_type ?? "post"),
    };
  }

  // REST API shape: { id, title:{rendered}, ... }
  if (raw.id !== undefined && raw.title) {
    return {
      id: Number(raw.id),
      title: String(raw.title?.rendered ?? raw.title ?? ""),
      excerpt: String(raw.excerpt?.rendered ?? raw.excerpt ?? ""),
      status: String(raw.status ?? "publish"),
      type: String(raw.type ?? "post"),
    };
  }

  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate webhook secret if configured
    const webhookSecret = Deno.env.get("WORDPRESS_WEBHOOK_SECRET");
    if (webhookSecret) {
      const incomingSecret = req.headers.get("X-Webhook-Secret");
      if (incomingSecret !== webhookSecret) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    const rawPayload = await req.json();
    const post = normalizePayload(rawPayload);

    if (!post) {
      console.error("Unrecognized WordPress payload shape:", JSON.stringify(rawPayload).slice(0, 500));
      return new Response(
        JSON.stringify({
          error: "Unrecognized payload shape",
          hint: "Send WP REST API format ({id, title:{rendered}, ...}) or WP Webhooks plugin format ({post_id, post:{ID, post_title, ...}}).",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Received WordPress post:", post.id, post.title);

    if (post.status !== "publish" || post.type !== "post") {
      console.log(`Post not published or not a post type, skipping (status=${post.status}, type=${post.type})`);
      return new Response(
        JSON.stringify({ message: "Post not published", status: post.status, type: post.type }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const stripHtml = (html: string): string => {
      return html.replace(/<[^>]*>/g, "").trim();
    };

    const title = stripHtml(post.title);
    const excerpt = stripHtml(post.excerpt);

    const notificationBody = excerpt.length > 100
      ? excerpt.substring(0, 100) + "..."
      : excerpt;

    const response = await fetch(
      `${supabaseUrl}/functions/v1/send-push-notification`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          title: "Nove vijesti!",
          body: title,
          type: "news",
          data: {
            post_id: post.id.toString(),
            post_title: title,
          },
        }),
      }
    );

    if (!response.ok) {
      console.error(
        "Failed to send notification:",
        await response.text()
      );
      throw new Error("Failed to send notification");
    }

    console.log("Notification sent successfully for post:", post.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Notification sent successfully",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing WordPress webhook:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey, X-Webhook-Secret",
};

interface WordPressPost {
  id: number;
  title: { rendered: string };
  excerpt: { rendered: string };
  status: string;
  type: string;
}

const stripHtml = (html: string): string => html.replace(/<[^>]*>/g, "").trim();

const json = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const expectedSecret = Deno.env.get("WORDPRESS_WEBHOOK_SECRET");
  if (!expectedSecret) {
    console.error("WORDPRESS_WEBHOOK_SECRET is not configured");
    return json(500, { error: "Webhook is not configured on the server" });
  }

  const providedSecret = req.headers.get("x-webhook-secret");
  if (!providedSecret || providedSecret !== expectedSecret) {
    return json(401, { error: "Invalid or missing webhook secret" });
  }

  try {
    const post: WordPressPost = await req.json();

    if (post.status !== "publish" || post.type !== "post") {
      return json(200, { message: "Post not published, ignoring" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const title = stripHtml(post.title.rendered);
    const excerpt = stripHtml(post.excerpt.rendered);

    const { data: alreadyNotified, error: lookupError } = await supabase
      .from("news_notifications")
      .select("wp_post_id")
      .eq("wp_post_id", post.id)
      .maybeSingle();

    if (lookupError) {
      console.error("Failed to check news_notifications:", lookupError);
    }

    if (alreadyNotified) {
      return json(200, { message: "Already notified for this post", postId: post.id });
    }

    const { error: insertError } = await supabase
      .from("news_notifications")
      .insert({ wp_post_id: post.id, title });

    if (insertError) {
      const message = insertError.message ?? "";
      if (insertError.code === "23505" || message.includes("duplicate")) {
        return json(200, { message: "Already notified (race)", postId: post.id });
      }
      throw insertError;
    }

    const notificationBody =
      excerpt.length > 100 ? excerpt.substring(0, 100) + "..." : excerpt || title;

    const response = await fetch(
      `${supabaseUrl}/functions/v1/send-push-notification`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          title: "Nove vijesti! 📰",
          body: notificationBody,
          type: "news",
          data: {
            post_id: post.id.toString(),
            post_title: title,
          },
        }),
      }
    );

    if (!response.ok) {
      console.error("Failed to send notification:", await response.text());
      throw new Error("Failed to send notification");
    }

    return json(200, { success: true, postId: post.id });
  } catch (error) {
    console.error("Error processing WordPress webhook:", error);
    return json(500, {
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

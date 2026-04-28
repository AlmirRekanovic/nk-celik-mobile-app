import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const WP_API_URL = "https://nkcelik.ba/wp-json/wp/v2/posts?per_page=5&_embed=1&orderby=date&order=desc";

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch latest posts from WordPress
    const wpResponse = await fetch(WP_API_URL, {
      headers: { "User-Agent": "NKCelik-NewsPoller/1.0" },
    });

    if (!wpResponse.ok) {
      throw new Error(`WordPress API error: ${wpResponse.status}`);
    }

    const posts: Array<{
      id: number;
      title: { rendered: string };
      excerpt: { rendered: string };
      status: string;
      type: string;
      date: string;
    }> = await wpResponse.json();

    if (!posts || posts.length === 0) {
      return new Response(
        JSON.stringify({ message: "No posts found", notified: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter to published posts only
    const publishedPosts = posts.filter(
      (p) => p.status === "publish" && p.type === "post"
    );

    if (publishedPosts.length === 0) {
      return new Response(
        JSON.stringify({ message: "No published posts", notified: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get IDs of posts already notified
    const postIds = publishedPosts.map((p) => p.id);
    const { data: alreadyNotified } = await supabase
      .from("news_notifications_log")
      .select("post_id")
      .in("post_id", postIds);

    const notifiedIds = new Set((alreadyNotified ?? []).map((r: { post_id: number }) => r.post_id));

    // Find new posts that haven't been notified yet
    const newPosts = publishedPosts.filter((p) => !notifiedIds.has(p.id));

    if (newPosts.length === 0) {
      return new Response(
        JSON.stringify({ message: "No new posts to notify", notified: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = [];

    for (const post of newPosts) {
      const title = stripHtml(post.title.rendered);
      const excerpt = stripHtml(post.excerpt.rendered);
      const body = excerpt.length > 100 ? excerpt.substring(0, 100) + "..." : excerpt;

      // Send push notification
      const notifResponse = await fetch(
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

      const success = notifResponse.ok;
      let tokensSent = 0;

      if (success) {
        const result = await notifResponse.json();
        tokensSent = result.sentCount ?? 0;
      } else {
        console.error("Failed to send notification for post", post.id, await notifResponse.text());
      }

      // Log the notification attempt
      await supabase.from("news_notifications_log").insert({
        post_id: post.id,
        post_title: title,
        tokens_sent: tokensSent,
        success,
      });

      results.push({ post_id: post.id, title, success, tokens_sent: tokensSent });
    }

    return new Response(
      JSON.stringify({
        message: "Polling complete",
        notified: results.filter((r) => r.success).length,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in news-poller:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

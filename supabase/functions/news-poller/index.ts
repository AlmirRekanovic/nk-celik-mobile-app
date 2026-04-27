import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const WP_BASE_URL =
  Deno.env.get("WP_BASE_URL") ?? "https://nkcelik.ba/wp-json/wp/v2";
const POLL_PAGE_SIZE = 10;

interface WordPressPost {
  id: number;
  title: { rendered: string };
  excerpt: { rendered: string };
  status?: string;
  type?: string;
  date?: string;
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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const wpUrl = `${WP_BASE_URL}/posts?per_page=${POLL_PAGE_SIZE}&orderby=date&order=desc`;
    const wpResponse = await fetch(wpUrl, {
      headers: { Accept: "application/json" },
    });

    if (!wpResponse.ok) {
      const text = await wpResponse.text();
      console.error("WP fetch failed:", wpResponse.status, text);
      return json(502, { error: "WordPress fetch failed", status: wpResponse.status });
    }

    const posts: WordPressPost[] = await wpResponse.json();

    if (!Array.isArray(posts) || posts.length === 0) {
      return json(200, { message: "No posts returned by WordPress", checked: 0, notified: 0 });
    }

    const ids = posts.map((p) => p.id);

    const { data: alreadyNotified, error: lookupError } = await supabase
      .from("news_notifications")
      .select("wp_post_id")
      .in("wp_post_id", ids);

    if (lookupError) {
      console.error("news_notifications lookup failed:", lookupError);
      throw lookupError;
    }

    const seen = new Set((alreadyNotified ?? []).map((row) => row.wp_post_id));

    const newPosts = posts
      .filter((post) => !seen.has(post.id))
      .filter((post) => (post.status ?? "publish") === "publish")
      .filter((post) => (post.type ?? "post") === "post")
      .sort((a, b) => a.id - b.id);

    let notifiedCount = 0;

    for (const post of newPosts) {
      const title = stripHtml(post.title?.rendered ?? "");
      if (!title) continue;

      const { error: insertError } = await supabase
        .from("news_notifications")
        .insert({ wp_post_id: post.id, title });

      if (insertError) {
        if (insertError.code === "23505") continue;
        console.error("news_notifications insert failed:", insertError);
        continue;
      }

      const excerpt = stripHtml(post.excerpt?.rendered ?? "");
      const body =
        excerpt.length > 100 ? excerpt.substring(0, 100) + "..." : excerpt || title;

      const fanoutResponse = await fetch(
        `${supabaseUrl}/functions/v1/send-push-notification`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            title: "Nove vijesti! 📰",
            body,
            type: "news",
            data: {
              post_id: post.id.toString(),
              post_title: title,
            },
          }),
        }
      );

      if (!fanoutResponse.ok) {
        console.error(
          "Fanout failed for post",
          post.id,
          await fanoutResponse.text()
        );
        continue;
      }

      notifiedCount += 1;
    }

    return json(200, {
      message: "News poll complete",
      checked: posts.length,
      notified: notifiedCount,
    });
  } catch (error) {
    console.error("news-poller error:", error);
    return json(500, {
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

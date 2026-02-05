const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface WordPressPost {
  id: number;
  title: {
    rendered: string;
  };
  excerpt: {
    rendered: string;
  };
  status: string;
  type: string;
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

    const post: WordPressPost = await req.json();

    console.log("Received WordPress post:", post.id);

    if (post.status !== "publish" || post.type !== "post") {
      console.log("Post not published or not a post type, skipping");
      return new Response(
        JSON.stringify({ message: "Post not published" }),
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

    const title = stripHtml(post.title.rendered);
    const excerpt = stripHtml(post.excerpt.rendered);

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
          title: "Nove vijesti! 📰",
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

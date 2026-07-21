// member-login — the only place member credentials are ever checked.
//
// The app POSTs either { email, member_id } or, for older members who have
// no email on file, { first_name, last_name, member_id }. We verify the pair
// against the members table with the service role (the table is not readable
// by clients at all) and return a signed HS256 JWT carrying sub = member
// uuid, role = 'authenticated' and an email claim. PostgREST/RLS then treat
// the caller as a normally authenticated user, so auth.uid() works everywhere.
//
// Deploy with --no-verify-jwt and set the JWT_SECRET secret (the project's
// legacy JWT secret from Dashboard → Settings → API) — see SECURITY_MIGRATION.md.

import { createClient } from "npm:@supabase/supabase-js@2";
import { signJwt } from "../_shared/jwt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days; app silently re-logs-in before expiry

// Best-effort per-isolate rate limit (isolates are ephemeral; this is a speed
// bump against credential stuffing, not the only defense — failures are logged).
const attempts = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 10;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    attempts.set(ip, { count: 1, windowStart: now });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const jwtSecret = Deno.env.get("JWT_SECRET") ?? Deno.env.get("SUPABASE_JWT_SECRET");
    if (!jwtSecret) {
      console.error("[member-login] JWT_SECRET is not configured");
      return json(500, { error: "Server misconfigured" });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (isRateLimited(ip)) {
      console.warn(`[member-login] rate limited: ${ip}`);
      return json(429, { error: "Too many attempts, try again later" });
    }

    const body = await req.json().catch(() => ({}));
    const memberId = typeof body.member_id === "string" ? body.member_id.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const firstName = typeof body.first_name === "string" ? body.first_name.trim() : "";
    const lastName = typeof body.last_name === "string" ? body.last_name.trim() : "";

    if (!memberId) {
      return json(400, { error: "member_id is required" });
    }
    // Need either an email or a full name to identify the member.
    const useNameLogin = !email && firstName && lastName;
    if (!email && !useNameLogin) {
      return json(400, { error: "email, or first_name + last_name, is required" });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let query = supabase
      .from("members")
      .select("id, member_id, first_name, last_name, email, is_admin, chat_nickname, created_at, last_login_at")
      .eq("member_id", memberId);

    query = useNameLogin
      ? query.ilike("first_name", firstName).ilike("last_name", lastName)
      : query.ilike("email", email);

    const { data: member, error } = await query.maybeSingle();

    if (error) {
      console.error("[member-login] lookup failed:", error);
      return json(500, { error: "Login failed" });
    }
    if (!member) {
      console.warn(`[member-login] invalid credentials (${useNameLogin ? "name" : "email"}) from ${ip}`);
      return json(401, { error: "Invalid credentials" });
    }

    await supabase
      .from("members")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", member.id);

    const nowSeconds = Math.floor(Date.now() / 1000);
    const expSeconds = nowSeconds + TOKEN_TTL_SECONDS;
    const token = await signJwt(
      {
        sub: member.id,
        role: "authenticated",
        aud: "authenticated",
        iss: "member-login",
        email: member.email ?? email ?? "",
        is_admin: member.is_admin === true,
        iat: nowSeconds,
        exp: expSeconds,
      },
      jwtSecret,
    );

    console.log(`[member-login] issued token for member ${member.id}`);
    return json(200, {
      token,
      expires_at: new Date(expSeconds * 1000).toISOString(),
      member,
    });
  } catch (error) {
    console.error("[member-login] error:", error);
    return json(500, { error: "Internal server error" });
  }
});

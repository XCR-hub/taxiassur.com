import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface LinkedInPostResult {
  id?: string;
  [key: string]: unknown;
}

async function publishToLinkedIn(content: string, accessToken: string): Promise<LinkedInPostResult> {
  const profileResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
    },
  });

  if (!profileResponse.ok) {
    const error = await profileResponse.text();
    throw new Error(`Failed to get LinkedIn profile: ${error}`);
  }

  const profile = await profileResponse.json();
  const authorUrn = `urn:li:person:${profile.sub}`;

  const postData = {
    author: authorUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text: content },
        shareMediaCategory: "NONE",
      },
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  };

  const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(postData),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LinkedIn API error: ${error}`);
  }

  return await response.json();
}

function buildPostUrl(linkedinId: string | undefined): string | null {
  if (!linkedinId) return null;
  const encoded = encodeURIComponent(linkedinId);
  return `https://www.linkedin.com/feed/update/${encoded}/`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch (_e) {
      body = {};
    }

    let { post_id, content, network_id } = body as {
      post_id?: string;
      content?: string;
      network_id?: string;
    };

    if (!post_id) {
      const { data: pending, error: pendingError } = await supabase
        .from("social_posts")
        .select("id, content, network_id")
        .eq("platform", "linkedin")
        .eq("status", "scheduled")
        .order("scheduled_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (pendingError) {
        throw new Error(`Failed to fetch scheduled post: ${pendingError.message}`);
      }

      if (!pending) {
        return new Response(
          JSON.stringify({ success: true, message: "No scheduled LinkedIn posts to publish" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      post_id = pending.id;
      content = pending.content;
      network_id = pending.network_id;
    }

    if (!content || !network_id) {
      const { data: postRow, error: postErr } = await supabase
        .from("social_posts")
        .select("content, network_id")
        .eq("id", post_id)
        .maybeSingle();

      if (postErr || !postRow) {
        throw new Error("Post not found");
      }
      content = content ?? postRow.content;
      network_id = network_id ?? postRow.network_id;
    }

    if (!network_id) {
      const { data: net } = await supabase
        .from("social_networks")
        .select("id")
        .eq("platform", "linkedin")
        .eq("is_active", true)
        .maybeSingle();
      if (!net) throw new Error("No active LinkedIn network configured");
      network_id = net.id;
    }

    const { data: network, error: networkError } = await supabase
      .from("social_networks")
      .select("access_token, token_expires_at")
      .eq("id", network_id)
      .maybeSingle();

    if (networkError || !network || !network.access_token) {
      throw new Error("LinkedIn account not properly configured");
    }

    if (network.token_expires_at) {
      const expiresAt = new Date(network.token_expires_at);
      if (expiresAt < new Date()) {
        throw new Error("LinkedIn access token is expired, please reconnect the account");
      }
    }

    const linkedInResponse = await publishToLinkedIn(content!, network.access_token);
    const linkedinId = typeof linkedInResponse.id === "string" ? linkedInResponse.id : undefined;
    const postUrl = buildPostUrl(linkedinId);

    const { error: updateError } = await supabase
      .from("social_posts")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
        post_url: postUrl,
        url: postUrl,
      })
      .eq("id", post_id);

    if (updateError) {
      console.error("Failed to update post status:", updateError);
    }

    const { error: rpcError } = await supabase.rpc(
      "increment_social_network_posts",
      { network_id_param: network_id }
    );

    if (rpcError) {
      const { data: current } = await supabase
        .from("social_networks")
        .select("total_posts")
        .eq("id", network_id)
        .maybeSingle();

      const nextCount = (current?.total_posts ?? 0) + 1;

      await supabase
        .from("social_networks")
        .update({
          total_posts: nextCount,
          last_post_at: new Date().toISOString(),
        })
        .eq("id", network_id);
    }

    try {
      await supabase.from("automation_logs").insert({
        automation_name: "linkedin_auto_publisher",
        status: "success",
        message: `Published post ${post_id} to LinkedIn`,
      });
    } catch (_e) {
      // ignore logging failures
    }

    return new Response(
      JSON.stringify({
        success: true,
        post_id,
        linkedin_id: linkedinId,
        post_url: postUrl,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("linkedin-auto-publisher error:", message);

    try {
      const body2 = await req.clone().json().catch(() => ({}));
      if (body2?.post_id) {
        await supabase
          .from("social_posts")
          .update({
            status: "failed",
            error_message: message.slice(0, 500),
          })
          .eq("id", body2.post_id);
      }

      await supabase.from("automation_logs").insert({
        automation_name: "linkedin_auto_publisher",
        status: "error",
        message: message.slice(0, 1000),
      });
    } catch (_e) {
      // ignore
    }

    return new Response(
      JSON.stringify({ success: false, error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

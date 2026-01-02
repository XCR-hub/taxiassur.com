import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function publishToLinkedIn(content: string, accessToken: string): Promise<any> {
  // Récupérer le profil utilisateur pour obtenir l'URN
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

  // Créer le post
  const postData = {
    author: authorUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: {
          text: content,
        },
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { post_id, content, network_id } = await req.json();

    if (!post_id || !content || !network_id) {
      throw new Error("Missing required parameters");
    }

    console.log(`Publishing to LinkedIn - Post ID: ${post_id}`);

    // Récupérer le token d'accès
    const { data: network, error: networkError } = await supabase
      .from("social_networks")
      .select("access_token, refresh_token, token_expires_at")
      .eq("id", network_id)
      .single();

    if (networkError || !network || !network.access_token) {
      throw new Error("LinkedIn account not properly configured");
    }

    // Vérifier si le token est expiré (si on a cette info)
    if (network.token_expires_at) {
      const expiresAt = new Date(network.token_expires_at);
      const now = new Date();
      if (expiresAt < now) {
        // TODO: Implémenter le refresh token si nécessaire
        console.warn("LinkedIn token may be expired");
      }
    }

    // Publier sur LinkedIn
    const linkedInResponse = await publishToLinkedIn(content, network.access_token);

    console.log("LinkedIn publish response:", linkedInResponse);

    // Mettre à jour le post en DB
    const { error: updateError } = await supabase
      .from("social_posts")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
        external_id: linkedInResponse.id || null,
        metadata: linkedInResponse,
      })
      .eq("id", post_id);

    if (updateError) {
      console.error("Failed to update post status:", updateError);
    }

    // Incrémenter le compteur de posts
    const { error: incrementError } = await supabase.rpc(
      "increment_social_network_posts",
      { network_id_param: network_id }
    ).catch(() => {
      // Si la fonction n'existe pas, faire un update manuel
      return supabase
        .from("social_networks")
        .update({
          total_posts: supabase.sql`total_posts + 1`,
          last_post_at: new Date().toISOString(),
        })
        .eq("id", network_id);
    });

    if (incrementError) {
      console.error("Failed to increment post count:", incrementError);
    }

    // Logger le succès
    await supabase.from("automation_logs").insert({
      automation_name: "linkedin_publisher",
      status: "success",
      message: `Successfully published post ${post_id} to LinkedIn`,
      metadata: { post_id, linkedin_response: linkedInResponse }
    });

    return new Response(
      JSON.stringify({
        success: true,
        post_id,
        linkedin_id: linkedInResponse.id,
        message: "Successfully published to LinkedIn",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in linkedin-publisher:", error);

    // Logger l'erreur
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      await supabase.from("automation_logs").insert({
        automation_name: "linkedin_publisher_error",
        status: "error",
        message: error.message,
        metadata: { error: error.toString() }
      });
    } catch (logError) {
      console.error("Failed to log error:", logError);
    }

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

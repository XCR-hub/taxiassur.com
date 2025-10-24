import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface LinkedInPublishRequest {
  text: string;
  imageUrl?: string;
  link?: string;
  organizationId?: string;
  visibility?: "PUBLIC" | "CONNECTIONS";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { text, imageUrl, link, organizationId, visibility = "PUBLIC" }: LinkedInPublishRequest = await req.json();

    if (!text) {
      return new Response(
        JSON.stringify({ error: "Le texte est requis" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: linkedinConfig, error: configError } = await supabase
      .from("social_networks")
      .select("access_token, config")
      .eq("platform", "linkedin")
      .maybeSingle();

    if (configError || !linkedinConfig) {
      return new Response(
        JSON.stringify({ error: "Configuration LinkedIn non trouvée" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const accessToken = linkedinConfig.access_token;

    if (!accessToken || accessToken === "YOUR_ACCESS_TOKEN_HERE") {
      return new Response(
        JSON.stringify({
          error: "Access Token LinkedIn manquant ou invalide. Exécutez LINKEDIN-ACTIVATION.sql et ajoutez votre token.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("🔵 Publication sur LinkedIn...");

    let authorUrn = "";
    if (organizationId) {
      authorUrn = `urn:li:organization:${organizationId}`;
    } else {
      const userInfoResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!userInfoResponse.ok) {
        throw new Error("Impossible de récupérer les infos utilisateur LinkedIn");
      }

      const userInfo = await userInfoResponse.json();
      authorUrn = `urn:li:person:${userInfo.sub}`;
      console.log("📝 Publication sur profil personnel:", userInfo.name);
    }

    const postData: any = {
      author: authorUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text: text,
          },
          shareMediaCategory: imageUrl || link ? "ARTICLE" : "NONE",
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": visibility,
      },
    };

    if (imageUrl || link) {
      postData.specificContent["com.linkedin.ugc.ShareContent"].media = [
        {
          status: "READY",
          originalUrl: link || imageUrl,
          ...(imageUrl && {
            media: imageUrl,
          }),
        },
      ];
    }

    const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(postData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Erreur LinkedIn API:", errorText);
      throw new Error(`LinkedIn API error: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    const postId = result.id;

    console.log("✅ Post LinkedIn publié:", postId);

    await supabase.from("social_posts").insert({
      platform: "linkedin",
      content: text,
      image_url: imageUrl,
      link: link,
      post_id: postId,
      published_at: new Date().toISOString(),
      status: "published",
    });

    return new Response(
      JSON.stringify({
        success: true,
        postId: postId,
        message: "Post LinkedIn publié avec succès !",
        url: `https://www.linkedin.com/feed/update/${postId}`,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("❌ Erreur:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
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

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PublishRequest {
  network_ids: string[];
  content: string;
  hashtags?: string[];
  media_urls?: string[];
  scheduled_at?: string;
}

interface SocialNetwork {
  id: string;
  name: string;
  api_available: boolean;
  api_credentials: any;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { network_ids, content, hashtags = [], media_urls = [], scheduled_at }: PublishRequest = await req.json();

    if (!network_ids || network_ids.length === 0 || !content) {
      return new Response(
        JSON.stringify({ error: "network_ids et content sont requis" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Connexion Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Récupérer les infos des réseaux
    const { data: networks, error: networksError } = await supabase
      .from("social_networks")
      .select("*")
      .in("id", network_ids);

    if (networksError) {
      throw new Error(`Erreur récupération réseaux: ${networksError.message}`);
    }

    const results = [];

    // Publier sur chaque réseau
    for (const network of networks as SocialNetwork[]) {
      try {
        let postUrl = null;
        let status = "published";
        let errorMessage = null;

        // Si le réseau a une API, tenter de publier
        if (network.api_available && network.api_credentials) {
          // Ici, on simule la publication
          // Dans un cas réel, vous intégreriez les APIs de chaque réseau

          // Exemple pour Facebook Graph API:
          // if (network.name === 'Facebook') {
          //   const response = await fetch(
          //     `https://graph.facebook.com/v18.0/me/feed`,
          //     {
          //       method: 'POST',
          //       headers: {
          //         'Authorization': `Bearer ${network.api_credentials.access_token}`
          //       },
          //       body: JSON.stringify({
          //         message: content,
          //         link: 'https://taxiassur.com'
          //       })
          //     }
          //   );
          //   const data = await response.json();
          //   postUrl = `https://facebook.com/${data.id}`;
          // }

          // Pour l'instant, on marque comme "scheduled" pour traitement manuel
          status = scheduled_at ? "scheduled" : "draft";
          postUrl = `${network.url}`;
        } else {
          // Pas d'API disponible, marquer pour publication manuelle
          status = "draft";
        }

        // Créer l'enregistrement du post
        const { data: post, error: postError } = await supabase
          .from("social_posts")
          .insert({
            network_id: network.id,
            content: content,
            hashtags: hashtags,
            media_urls: media_urls,
            post_url: postUrl,
            scheduled_at: scheduled_at || new Date().toISOString(),
            published_at: status === "published" ? new Date().toISOString() : null,
            status: status,
            error_message: errorMessage,
          })
          .select()
          .single();

        if (postError) {
          throw new Error(`Erreur création post ${network.name}: ${postError.message}`);
        }

        results.push({
          network: network.name,
          status: "success",
          post_id: post.id,
          post_url: postUrl,
        });
      } catch (error: any) {
        // Enregistrer l'erreur
        await supabase.from("social_posts").insert({
          network_id: network.id,
          content: content,
          hashtags: hashtags,
          media_urls: media_urls,
          status: "failed",
          error_message: error.message,
        });

        results.push({
          network: network.name,
          status: "failed",
          error: error.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Publication créée sur ${results.length} réseaux`,
        results: results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Erreur:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Erreur lors de la publication",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PinterestBoard {
  id: string;
  name: string;
}

async function getPinterestBoards(accessToken: string): Promise<PinterestBoard[]> {
  const response = await fetch("https://api.pinterest.com/v5/boards", {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Pinterest boards: ${error}`);
  }

  const data = await response.json();
  return data.items || [];
}

async function publishToPinterest(
  content: string,
  accessToken: string,
  boardId?: string
): Promise<any> {
  // Si pas de board ID spécifié, prendre le premier board
  let targetBoardId = boardId;
  if (!targetBoardId) {
    const boards = await getPinterestBoards(accessToken);
    if (boards.length === 0) {
      throw new Error("No Pinterest boards found");
    }
    targetBoardId = boards[0].id;
  }

  // Générer une image par défaut ou utiliser une image stock
  // Pour l'instant, on utilise une image placeholder
  const imageUrl = "https://images.pexels.com/photos/733745/pexels-photo-733745.jpeg?auto=compress&cs=tinysrgb&w=800";

  // Extraire le titre (première ligne du contenu)
  const lines = content.split("\n");
  const title = lines[0].substring(0, 100) || "TaxiAssur - Assurance Taxi";
  const description = content.substring(0, 500);

  // Créer le pin
  const pinData = {
    board_id: targetBoardId,
    title: title,
    description: description,
    link: "https://taxiassur.fr",
    media_source: {
      source_type: "image_url",
      url: imageUrl,
    },
  };

  const response = await fetch("https://api.pinterest.com/v5/pins", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(pinData),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Pinterest API error: ${error}`);
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

    const { post_id, content, network_id, board_id } = await req.json();

    if (!post_id || !content || !network_id) {
      throw new Error("Missing required parameters");
    }

    console.log(`Publishing to Pinterest - Post ID: ${post_id}`);

    // Récupérer le token d'accès
    const { data: network, error: networkError } = await supabase
      .from("social_networks")
      .select("access_token, refresh_token, token_expires_at, metadata")
      .eq("id", network_id)
      .single();

    if (networkError || !network || !network.access_token) {
      throw new Error("Pinterest account not properly configured");
    }

    // Vérifier si le token est expiré
    if (network.token_expires_at) {
      const expiresAt = new Date(network.token_expires_at);
      const now = new Date();
      if (expiresAt < now) {
        console.warn("Pinterest token may be expired");
      }
    }

    // Récupérer le board ID depuis metadata si disponible
    const defaultBoardId = board_id || network.metadata?.default_board_id;

    // Publier sur Pinterest
    const pinterestResponse = await publishToPinterest(
      content,
      network.access_token,
      defaultBoardId
    );

    console.log("Pinterest publish response:", pinterestResponse);

    // Mettre à jour le post en DB
    const { error: updateError } = await supabase
      .from("social_posts")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
        external_id: pinterestResponse.id || null,
        metadata: pinterestResponse,
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
      automation_name: "pinterest_publisher",
      status: "success",
      message: `Successfully published post ${post_id} to Pinterest`,
      metadata: { post_id, pinterest_response: pinterestResponse }
    });

    return new Response(
      JSON.stringify({
        success: true,
        post_id,
        pinterest_id: pinterestResponse.id,
        pin_url: pinterestResponse.link,
        message: "Successfully published to Pinterest",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in pinterest-publisher:", error);

    // Logger l'erreur
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      await supabase.from("automation_logs").insert({
        automation_name: "pinterest_publisher_error",
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

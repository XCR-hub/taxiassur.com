import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PinterestPublishRequest {
  board_id?: string;
  title: string;
  description: string;
  link: string;
  image_url: string;
  alt_text?: string;
}

interface PinterestBoard {
  id: string;
  name: string;
  privacy: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { board_id, title, description, link, image_url, alt_text }: PinterestPublishRequest = await req.json();

    if (!title || !description || !link || !image_url) {
      return new Response(
        JSON.stringify({ error: "title, description, link et image_url sont requis" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const pinterestToken = Deno.env.get("PINTEREST_ACCESS_TOKEN");

    if (!pinterestToken) {
      return new Response(
        JSON.stringify({ error: "Pinterest Access Token manquant dans les secrets Supabase" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const supabase = createClient(supabaseUrl, supabaseKey);

    let finalBoardId = board_id;

    if (!finalBoardId) {
      const boardsResponse = await fetch("https://api.pinterest.com/v5/boards", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${pinterestToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!boardsResponse.ok) {
        const error = await boardsResponse.text();
        throw new Error(`Erreur récupération boards: ${error}`);
      }

      const boardsData = await boardsResponse.json();
      if (boardsData.items && boardsData.items.length > 0) {
        finalBoardId = boardsData.items[0].id;
      } else {
        throw new Error("Aucun board Pinterest trouvé. Créez un board d'abord.");
      }
    }

    const pinData = {
      board_id: finalBoardId,
      title: title.substring(0, 100),
      description: description.substring(0, 500),
      link: link,
      media_source: {
        source_type: "image_url",
        url: image_url,
      },
      alt_text: alt_text || title,
    };

    const pinterestResponse = await fetch("https://api.pinterest.com/v5/pins", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${pinterestToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pinData),
    });

    if (!pinterestResponse.ok) {
      const error = await pinterestResponse.text();
      throw new Error(`Erreur publication Pinterest: ${error}`);
    }

    const pinResult = await pinterestResponse.json();

    const { data: network } = await supabase
      .from("social_networks")
      .select("id")
      .eq("platform", "pinterest")
      .single();

    if (network) {
      await supabase.from("social_posts").insert({
        network_id: network.id,
        content: description,
        media_urls: [image_url],
        post_url: `https://www.pinterest.com/pin/${pinResult.id}/`,
        status: "published",
        published_at: new Date().toISOString(),
        metrics: {
          pin_id: pinResult.id,
          board_id: finalBoardId,
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        pin_id: pinResult.id,
        pin_url: `https://www.pinterest.com/pin/${pinResult.id}/`,
        board_id: finalBoardId,
        created_at: pinResult.created_at,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Erreur Pinterest:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Erreur inconnue",
        details: error.toString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

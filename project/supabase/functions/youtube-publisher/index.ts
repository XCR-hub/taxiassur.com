import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface VideoUploadRequest {
  title: string;
  description: string;
  videoUrl?: string;
  videoFile?: string;
  tags?: string[];
  category?: string;
  privacy?: "public" | "private" | "unlisted";
  isShort?: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { title, description, videoUrl, videoFile, tags, category, privacy, isShort } = await req.json() as VideoUploadRequest;

    const CLIENT_ID = Deno.env.get("YOUTUBE_CLIENT_ID");
    const CLIENT_SECRET = Deno.env.get("YOUTUBE_CLIENT_SECRET");
    const REFRESH_TOKEN = Deno.env.get("YOUTUBE_REFRESH_TOKEN");
    const CHANNEL_ID = Deno.env.get("YOUTUBE_CHANNEL_ID") || "UCA6e6kCpI-6E_kpjGRLXY7A";

    if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
      throw new Error("YouTube credentials manquantes. Vérifiez les secrets Edge Functions.");
    }

    console.log("🎥 Début upload YouTube:", { title, isShort, privacy });

    const accessToken = await getAccessToken(CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN);

    let videoData: ArrayBuffer;

    if (videoFile) {
      const base64Data = videoFile.replace(/^data:video\/\w+;base64,/, "");
      videoData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)).buffer;
    } else if (videoUrl) {
      const videoResponse = await fetch(videoUrl);
      if (!videoResponse.ok) {
        throw new Error(`Impossible de télécharger la vidéo: ${videoResponse.statusText}`);
      }
      videoData = await videoResponse.arrayBuffer();
    } else {
      throw new Error("videoUrl ou videoFile requis");
    }

    const metadata = {
      snippet: {
        title: title,
        description: description,
        tags: tags || ["taxi", "assurance", "TaxiAssur"],
        categoryId: category || "2",
        channelId: CHANNEL_ID,
      },
      status: {
        privacyStatus: privacy || "public",
        selfDeclaredMadeForKids: false,
      },
    };

    if (isShort) {
      metadata.snippet.title = `#Shorts ${title}`;
      metadata.snippet.tags = [...(metadata.snippet.tags || []), "shorts", "short"];
    }

    const boundary = "-------314159265358979323846";
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadataString = JSON.stringify(metadata);
    const metadataPart = `Content-Type: application/json; charset=UTF-8\r\n\r\n${metadataString}`;
    const videoPart = `Content-Type: video/mp4\r\n\r\n`;

    const encoder = new TextEncoder();
    const delimiterBytes = encoder.encode(delimiter);
    const metadataBytes = encoder.encode(metadataPart);
    const videoPartBytes = encoder.encode(videoPart);
    const closeDelimiterBytes = encoder.encode(closeDelimiter);

    const body = new Uint8Array(
      delimiterBytes.length +
      metadataBytes.length +
      delimiterBytes.length +
      videoPartBytes.length +
      videoData.byteLength +
      closeDelimiterBytes.length
    );

    let offset = 0;
    body.set(delimiterBytes, offset);
    offset += delimiterBytes.length;
    body.set(metadataBytes, offset);
    offset += metadataBytes.length;
    body.set(delimiterBytes, offset);
    offset += delimiterBytes.length;
    body.set(videoPartBytes, offset);
    offset += videoPartBytes.length;
    body.set(new Uint8Array(videoData), offset);
    offset += videoData.byteLength;
    body.set(closeDelimiterBytes, offset);

    console.log("📤 Upload vers YouTube API...");

    const uploadResponse = await fetch(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body: body,
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("❌ Erreur YouTube API:", errorText);
      throw new Error(`YouTube upload failed: ${uploadResponse.statusText} - ${errorText}`);
    }

    const result = await uploadResponse.json();

    console.log("✅ Vidéo uploadée:", result.id);

    return new Response(
      JSON.stringify({
        success: true,
        videoId: result.id,
        url: `https://www.youtube.com/watch?v=${result.id}`,
        channelUrl: `https://www.youtube.com/channel/${CHANNEL_ID}`,
        isShort: isShort,
        message: isShort
          ? "YouTube Short publié avec succès !"
          : "Vidéo YouTube publiée avec succès !",
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

async function getAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<string> {
  console.log("🔄 Rafraîchissement du token YouTube...");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ Erreur refresh token:", errorText);
    throw new Error(`Failed to refresh access token: ${errorText}`);
  }

  const data = await response.json();
  console.log("✅ Access token obtenu");

  return data.access_token;
}

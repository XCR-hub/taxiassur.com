import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const accessToken: string = body.access_token;
    const personUrn: string = body.person_urn;
    const content: string = body.content;
    const imageUrl: string = body.image_url;

    if (!accessToken || !personUrn || !content || !imageUrl) {
      return new Response(JSON.stringify({ error: "Missing params" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error(`Pexels fetch failed: ${imgRes.status}`);
    const imgBytes = new Uint8Array(await imgRes.arrayBuffer());

    const regRes = await fetch("https://api.linkedin.com/v2/assets?action=registerUpload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        registerUploadRequest: {
          recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
          owner: personUrn,
          serviceRelationships: [
            { relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" },
          ],
        },
      }),
    });
    const regJson = await regRes.json();
    if (!regRes.ok) {
      return new Response(JSON.stringify({ step: "register", error: regJson }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const uploadUrl =
      regJson.value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]
        .uploadUrl;
    const assetUrn = regJson.value.asset;

    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/octet-stream",
      },
      body: imgBytes,
    });
    if (!uploadRes.ok) {
      const txt = await uploadRes.text();
      return new Response(
        JSON.stringify({ step: "upload", status: uploadRes.status, body: txt }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const postBody = {
      author: personUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: content },
          shareMediaCategory: "IMAGE",
          media: [
            {
              status: "READY",
              description: { text: "Assurance taxi" },
              media: assetUrn,
              title: { text: "TaxiAssur" },
            },
          ],
        },
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    };

    const postRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(postBody),
    });
    const postText = await postRes.text();
    let postJson: any = null;
    try { postJson = JSON.parse(postText); } catch { /* empty */ }

    if (!postRes.ok) {
      return new Response(
        JSON.stringify({ step: "post", status: postRes.status, body: postJson ?? postText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const shareUrn = postRes.headers.get("x-restli-id") || postJson?.id;

    return new Response(
      JSON.stringify({
        success: true,
        share_urn: shareUrn,
        asset_urn: assetUrn,
        post_url: shareUrn ? `https://www.linkedin.com/feed/update/${shareUrn}` : null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

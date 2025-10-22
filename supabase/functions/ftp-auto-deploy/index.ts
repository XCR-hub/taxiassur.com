import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface FTPDeploymentRequest {
  files: Array<{
    path: string;
    content: string;
  }>;
  build_dist?: boolean;
  improvement_id?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { files, build_dist = false, improvement_id }: FTPDeploymentRequest = await req.json();

    const FTP_HOST = Deno.env.get("FTP_HOST");
    const FTP_USER = Deno.env.get("FTP_USER");
    const FTP_PASSWORD = Deno.env.get("FTP_PASSWORD");
    const FTP_PORT = Deno.env.get("FTP_PORT") || "22";
    const FTP_PROTOCOL = Deno.env.get("FTP_PROTOCOL") || "sftp";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!FTP_HOST || !FTP_USER || !FTP_PASSWORD) {
      throw new Error("Credentials FTP/SFTP manquants dans les secrets Supabase");
    }

    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

    const uploadResults = [];

    for (const file of files) {
      try {
        const remotePath = file.path.startsWith("/") ? file.path : `/${file.path}`;

        let response;

        if (FTP_PROTOCOL === "sftp" || FTP_PORT === "22") {
          response = await fetch(`sftp://${FTP_HOST}:${FTP_PORT}${remotePath}`, {
            method: "PUT",
            body: file.content,
            headers: {
              "Authorization": `Basic ${btoa(`${FTP_USER}:${FTP_PASSWORD}`)}`,
              "Content-Type": "text/plain",
            },
          });
        } else {
          response = await fetch(`ftp://${FTP_USER}:${FTP_PASSWORD}@${FTP_HOST}:${FTP_PORT}${remotePath}`, {
            method: "PUT",
            body: file.content,
            headers: {
              "Content-Type": "text/plain",
            },
          });
        }

        if (!response.ok) {
          throw new Error(`${FTP_PROTOCOL.toUpperCase()} upload failed: ${response.statusText}`);
        }

        uploadResults.push({
          path: file.path,
          status: "success",
          size_bytes: file.content.length,
          protocol: FTP_PROTOCOL,
        });
      } catch (error) {
        uploadResults.push({
          path: file.path,
          status: "error",
          error: error.message,
        });
      }
    }

    const allSuccess = uploadResults.every((r) => r.status === "success");

    await supabase.from("ai_deployments").insert({
      deployment_type: "ftp",
      target: "ionos_production",
      files_changed: uploadResults,
      ftp_files_uploaded: uploadResults.filter((r) => r.status === "success"),
      status: allSuccess ? "success" : "partial_failure",
      triggered_by: "ai_auto_improvement",
      improvement_id,
    });

    if (improvement_id && allSuccess) {
      await supabase
        .from("ai_page_improvements")
        .update({
          status: "deployed",
          deployed_at: new Date().toISOString(),
        })
        .eq("id", improvement_id);
    }

    return new Response(
      JSON.stringify({
        success: allSuccess,
        upload_results: uploadResults,
        total_files: files.length,
        successful_uploads: uploadResults.filter((r) => r.status === "success").length,
        message: allSuccess
          ? `${files.length} fichier(s) uploadé(s) sur IONOS avec succès`
          : "Upload partiel - certains fichiers ont échoué",
      }),
      {
        status: allSuccess ? 200 : 207,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in ftp-auto-deploy:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        note: "Vérifier que les credentials FTP sont corrects dans Supabase Dashboard > Settings > Vault",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

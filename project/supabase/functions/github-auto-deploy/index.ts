import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DeploymentRequest {
  files: Array<{
    path: string;
    content: string;
    action: "create" | "update" | "delete";
  }>;
  commit_message: string;
  branch?: string;
  improvement_id?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { files, commit_message, branch = "main", improvement_id }: DeploymentRequest = await req.json();

    const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN");
    const GITHUB_REPO = Deno.env.get("GITHUB_REPO") || "owner/taxiassur-website";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!GITHUB_TOKEN) {
      throw new Error("GITHUB_TOKEN manquant dans les secrets Supabase");
    }

    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

    const githubApiBase = `https://api.github.com/repos/${GITHUB_REPO}`;

    const getFilesha = async (filePath: string): Promise<string | null> => {
      try {
        const response = await fetch(`${githubApiBase}/contents/${filePath}?ref=${branch}`, {
          headers: {
            "Authorization": `token ${GITHUB_TOKEN}`,
            "Accept": "application/vnd.github.v3+json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          return data.sha;
        }
        return null;
      } catch {
        return null;
      }
    };

    const commitResults = [];

    for (const file of files) {
      try {
        const existingSha = await getFilesha(file.path);

        if (file.action === "delete" && existingSha) {
          const response = await fetch(`${githubApiBase}/contents/${file.path}`, {
            method: "DELETE",
            headers: {
              "Authorization": `token ${GITHUB_TOKEN}`,
              "Accept": "application/vnd.github.v3+json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: `Delete ${file.path} - ${commit_message}`,
              sha: existingSha,
              branch,
            }),
          });

          if (!response.ok) {
            throw new Error(`Failed to delete ${file.path}: ${await response.text()}`);
          }

          commitResults.push({
            path: file.path,
            action: "deleted",
            status: "success",
          });
        } else if (file.action === "create" || file.action === "update") {
          const content = btoa(unescape(encodeURIComponent(file.content)));

          const body: any = {
            message: `${file.action === "create" ? "Create" : "Update"} ${file.path} - ${commit_message}`,
            content,
            branch,
          };

          if (existingSha) {
            body.sha = existingSha;
          }

          const response = await fetch(`${githubApiBase}/contents/${file.path}`, {
            method: "PUT",
            headers: {
              "Authorization": `token ${GITHUB_TOKEN}`,
              "Accept": "application/vnd.github.v3+json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            throw new Error(`Failed to ${file.action} ${file.path}: ${await response.text()}`);
          }

          const result = await response.json();

          commitResults.push({
            path: file.path,
            action: file.action,
            status: "success",
            commit_sha: result.commit.sha,
            commit_url: result.commit.html_url,
          });
        }
      } catch (error) {
        commitResults.push({
          path: file.path,
          action: file.action,
          status: "error",
          error: error.message,
        });
      }
    }

    const allSuccess = commitResults.every((r) => r.status === "success");
    const lastCommit = commitResults.find((r) => r.commit_sha);

    await supabase.from("ai_deployments").insert({
      deployment_type: "github",
      target: branch,
      files_changed: commitResults,
      github_commit_sha: lastCommit?.commit_sha,
      github_commit_url: lastCommit?.commit_url,
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

      await supabase
        .from("ai_optimizations")
        .update({
          status: "terminé",
          progress: 100,
        })
        .eq("description", "ilike", `%${improvement_id}%`);
    }

    return new Response(
      JSON.stringify({
        success: allSuccess,
        commit_results: commitResults,
        commit_sha: lastCommit?.commit_sha,
        commit_url: lastCommit?.commit_url,
        message: allSuccess
          ? `${files.length} fichier(s) déployé(s) sur GitHub avec succès`
          : "Déploiement partiel - certains fichiers ont échoué",
      }),
      {
        status: allSuccess ? 200 : 207,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in github-auto-deploy:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PublishItem {
  id: string;
  file_path: string;
  file_content: string;
  operation: string;
  commit_message: string;
  triggered_by: string;
}

/**
 * FONCTION EDGE: Publication automatique Git
 *
 * 🎯 Workflow:
 * 1. Récupère les modifications en attente dans code_publish_queue
 * 2. Commit vers GitHub via API
 * 3. Déclenche le rebuild Bolt.new (webhook)
 * 4. Marque comme publié dans l'historique
 *
 * 🤖 Appelé par:
 * - Cron toutes les 10 minutes
 * - Manuellement depuis le backoffice
 * - Automatiquement après génération IA
 */

async function commitToGitHub(
  repoOwner: string,
  repoName: string,
  filePath: string,
  content: string,
  message: string,
  branch: string,
  token: string
): Promise<{ success: boolean; sha?: string; error?: string }> {
  const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`;

  try {
    // 1. Récupérer le SHA actuel du fichier s'il existe
    let currentSha: string | null = null;

    const getResponse = await fetch(apiUrl, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "TaxiAssur-AI-Publisher",
      },
    });

    if (getResponse.ok) {
      const fileData = await getResponse.json();
      currentSha = fileData.sha;
    }

    // 2. Encoder le contenu en base64
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const base64Content = btoa(String.fromCharCode(...data));

    // 3. Créer ou mettre à jour le fichier
    const updateResponse = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json",
        "User-Agent": "TaxiAssur-AI-Publisher",
      },
      body: JSON.stringify({
        message,
        content: base64Content,
        branch,
        ...(currentSha && { sha: currentSha }),
      }),
    });

    if (!updateResponse.ok) {
      const error = await updateResponse.text();
      throw new Error(`GitHub API error: ${error}`);
    }

    const result = await updateResponse.json();
    return {
      success: true,
      sha: result.commit.sha,
    };
  } catch (error) {
    console.error("❌ Erreur commit GitHub:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

async function triggerBoltRebuild(webhookUrl?: string): Promise<boolean> {
  if (!webhookUrl) {
    console.log("⚠️ Webhook Bolt.new non configuré - rebuild manuel requis");
    return false;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: "taxiassur-ai-seo",
        trigger: "auto-publish",
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      console.error("❌ Erreur webhook Bolt.new:", await response.text());
      return false;
    }

    console.log("✅ Rebuild Bolt.new déclenché avec succès");
    return true;
  } catch (error) {
    console.error("❌ Erreur déclenchement rebuild:", error);
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const githubToken = Deno.env.get("GITHUB_TOKEN");
    const boltWebhook = Deno.env.get("BOLT_REBUILD_WEBHOOK_URL");

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("🚀 Démarrage publication automatique Git...");

    // 1. Récupérer la config Git
    const { data: config, error: configError } = await supabase
      .from("git_repository_config")
      .select("*")
      .single();

    if (configError || !config) {
      throw new Error("Configuration Git non trouvée");
    }

    if (!config.auto_commit_enabled) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Publication automatique désactivée",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!githubToken) {
      throw new Error("GITHUB_TOKEN non configuré dans les secrets Supabase");
    }

    // 2. Récupérer les modifications en attente
    const { data: pendingItems, error: queueError } = await supabase.rpc(
      "get_pending_code_publishes",
      { p_limit: 10 }
    );

    if (queueError) {
      throw new Error(`Erreur récupération queue: ${queueError.message}`);
    }

    if (!pendingItems || pendingItems.length === 0) {
      console.log("ℹ️ Aucune modification en attente");
      return new Response(
        JSON.stringify({
          success: true,
          message: "Aucune modification en attente",
          published: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📝 ${pendingItems.length} modification(s) à publier`);

    // 3. Extraire owner/repo de l'URL
    const repoMatch = config.repository_url.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!repoMatch) {
      throw new Error("URL repository invalide");
    }

    const [, repoOwner, repoName] = repoMatch;

    // 4. Publier chaque modification
    const results = [];
    for (const item of pendingItems as PublishItem[]) {
      console.log(`📤 Publication: ${item.file_path}`);

      // Marquer comme en cours
      await supabase
        .from("code_publish_queue")
        .update({ status: "processing" })
        .eq("id", item.id);

      // Commit vers GitHub
      const commitResult = await commitToGitHub(
        repoOwner,
        repoName.replace(/\.git$/, ""),
        item.file_path,
        item.file_content,
        `${config.commit_message_prefix} ${item.commit_message}`,
        config.branch_name,
        githubToken
      );

      // Marquer comme publié ou échoué
      await supabase.rpc("mark_publish_completed", {
        p_queue_id: item.id,
        p_commit_sha: commitResult.sha || null,
        p_success: commitResult.success,
        p_error_message: commitResult.error || null,
      });

      results.push({
        file: item.file_path,
        success: commitResult.success,
        sha: commitResult.sha,
        error: commitResult.error,
      });

      console.log(
        commitResult.success
          ? `✅ ${item.file_path} publié (${commitResult.sha})`
          : `❌ ${item.file_path} échoué: ${commitResult.error}`
      );
    }

    // 5. Déclencher le rebuild Bolt.new si au moins une publication réussie
    const successCount = results.filter((r) => r.success).length;
    let rebuildTriggered = false;

    if (successCount > 0 && config.auto_deploy_enabled) {
      rebuildTriggered = await triggerBoltRebuild(boltWebhook);
    }

    const summary = {
      success: true,
      total: pendingItems.length,
      published: successCount,
      failed: results.filter((r) => !r.success).length,
      rebuild_triggered: rebuildTriggered,
      results,
    };

    console.log("✅ Publication terminée:", summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Erreur publication Git:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

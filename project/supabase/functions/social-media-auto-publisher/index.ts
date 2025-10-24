import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SocialPost {
  id: string;
  platform: string;
  content: string;
  post_url: string | null;
  status: string;
  metadata: any;
}

/**
 * Edge Function: Auto-Publisher Réseaux Sociaux
 *
 * Publie automatiquement le contenu sur Facebook et LinkedIn
 * via Make.com webhooks
 *
 * Triggers:
 * - Cron quotidien
 * - Manuel depuis backoffice
 * - Auto depuis publication article/news
 */

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Facebook & LinkedIn credentials from env
    const facebookPageToken = Deno.env.get("FACEBOOK_PAGE_ACCESS_TOKEN");
    const linkedinAccessToken = Deno.env.get("LINKEDIN_ACCESS_TOKEN");
    const linkedinOrganizationId = Deno.env.get("LINKEDIN_ORGANIZATION_ID");
    const makeWebhookUrl = Deno.env.get("MAKE_SOCIAL_WEBHOOK_URL");

    console.log("Checking credentials...");
    console.log("Facebook token present:", !!facebookPageToken);
    console.log("LinkedIn token present:", !!linkedinAccessToken);
    console.log("Make webhook present:", !!makeWebhookUrl);

    // Get posts scheduled for publication
    const { data: scheduledPosts, error: fetchError } = await supabase
      .from("social_posts")
      .select("*")
      .eq("status", "scheduled")
      .order("created_at", { ascending: true })
      .limit(10);

    if (fetchError) {
      throw new Error(`Failed to fetch posts: ${fetchError.message}`);
    }

    if (!scheduledPosts || scheduledPosts.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No posts to publish",
          published: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Found ${scheduledPosts.length} posts to publish`);

    const results = [];

    for (const post of scheduledPosts) {
      try {
        let published = false;
        let externalId = null;
        let errorMessage = null;

        // Publish to Facebook
        if (post.platform === "facebook" && facebookPageToken) {
          try {
            const fbResponse = await fetch(
              `https://graph.facebook.com/v18.0/me/feed`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  message: post.content,
                  link: post.post_url,
                  access_token: facebookPageToken,
                }),
              }
            );

            if (fbResponse.ok) {
              const fbData = await fbResponse.json();
              externalId = fbData.id;
              published = true;
              console.log(`✅ Published to Facebook: ${externalId}`);
            } else {
              const errorData = await fbResponse.text();
              errorMessage = `Facebook API error: ${errorData}`;
              console.error(errorMessage);
            }
          } catch (fbError) {
            errorMessage = `Facebook error: ${fbError.message}`;
            console.error(errorMessage);
          }
        }

        // Publish to LinkedIn
        else if (post.platform === "linkedin" && linkedinAccessToken && linkedinOrganizationId) {
          try {
            const liResponse = await fetch(
              `https://api.linkedin.com/v2/ugcPosts`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${linkedinAccessToken}`,
                  "X-Restli-Protocol-Version": "2.0.0",
                },
                body: JSON.stringify({
                  author: `urn:li:organization:${linkedinOrganizationId}`,
                  lifecycleState: "PUBLISHED",
                  specificContent: {
                    "com.linkedin.ugc.ShareContent": {
                      shareCommentary: {
                        text: post.content,
                      },
                      shareMediaCategory: "ARTICLE",
                      media: post.post_url ? [
                        {
                          status: "READY",
                          originalUrl: post.post_url,
                        },
                      ] : [],
                    },
                  },
                  visibility: {
                    "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
                  },
                }),
              }
            );

            if (liResponse.ok) {
              const liData = await liResponse.json();
              externalId = liData.id;
              published = true;
              console.log(`✅ Published to LinkedIn: ${externalId}`);
            } else {
              const errorData = await liResponse.text();
              errorMessage = `LinkedIn API error: ${errorData}`;
              console.error(errorMessage);
            }
          } catch (liError) {
            errorMessage = `LinkedIn error: ${liError.message}`;
            console.error(errorMessage);
          }
        }

        // Fallback: Send to Make.com webhook
        else if (makeWebhookUrl) {
          try {
            const makeResponse = await fetch(makeWebhookUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                platform: post.platform,
                content: post.content,
                url: post.post_url,
                post_id: post.id,
              }),
            });

            if (makeResponse.ok) {
              published = true;
              console.log(`✅ Sent to Make.com: ${post.platform}`);
            } else {
              errorMessage = `Make.com webhook error`;
              console.error(errorMessage);
            }
          } catch (makeError) {
            errorMessage = `Make.com error: ${makeError.message}`;
            console.error(errorMessage);
          }
        }

        // Update post status
        const newStatus = published ? "published" : "failed";
        const updateData: any = {
          status: newStatus,
          published_at: published ? new Date().toISOString() : null,
        };

        if (externalId) {
          updateData.external_post_id = externalId;
        }

        if (errorMessage) {
          updateData.error_message = errorMessage;
        }

        const { error: updateError } = await supabase
          .from("social_posts")
          .update(updateData)
          .eq("id", post.id);

        if (updateError) {
          console.error(`Failed to update post ${post.id}:`, updateError);
        }

        results.push({
          post_id: post.id,
          platform: post.platform,
          published,
          external_id: externalId,
          error: errorMessage,
        });
      } catch (postError) {
        console.error(`Error processing post ${post.id}:`, postError);
        results.push({
          post_id: post.id,
          platform: post.platform,
          published: false,
          error: postError.message,
        });
      }
    }

    const successCount = results.filter((r) => r.published).length;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Published ${successCount}/${results.length} posts`,
        published: successCount,
        failed: results.length - successCount,
        details: results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Function error:", error);

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

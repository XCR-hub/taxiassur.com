import { createClient } from "npm:@supabase/supabase-js@2";
import { isInternalRequest } from "../_shared/internal-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendGridEmail {
  msg_id: string;
  from_email: string;
  subject: string;
  to_email: string;
  status: string;
  opens_count: number;
  clicks_count: number;
  last_event_time: string;
}

async function fetchSendGridEmails(
  apiKey: string,
  limit: number = 1000,
): Promise<SendGridEmail[]> {
  const emails: SendGridEmail[] = [];

  try {
    const response = await fetch(
      `https://api.sendgrid.com/v3/messages?limit=${limit}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`SendGrid API error: ${response.status} - ${errorText}`);
      return [];
    }

    const data = await response.json();

    if (data.messages) {
      emails.push(...data.messages);
    }
  } catch (error) {
    console.error("Error fetching SendGrid emails:", error);
  }

  return emails;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!(await isInternalRequest(req))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sendGridApiKey = Deno.env.get("SENDGRID_API_KEY");

    if (!sendGridApiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "SENDGRID_API_KEY not configured in environment",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Fetching emails from SendGrid API...");
    const sendGridEmails = await fetchSendGridEmails(sendGridApiKey, 1000);
    console.log(`Retrieved ${sendGridEmails.length} emails from SendGrid`);

    let inserted = 0;
    let skipped = 0;
    let errors = 0;

    for (const email of sendGridEmails) {
      try {
        const { data: existing } = await supabase
          .from("email_messages")
          .select("id")
          .eq("message_id", email.msg_id)
          .maybeSingle();

        if (existing) {
          skipped++;
          continue;
        }

        const emailData = {
          message_id: email.msg_id,
          thread_id: null,
          from_email: email.from_email,
          from_name: email.from_email,
          to_emails: [email.to_email],
          to_names: [email.to_email],
          subject: email.subject || "(No Subject)",
          body_text: "",
          received_at: email.last_event_time,
          sent_at: email.last_event_time,
          direction: "outbound",
          status: email.status,
          channel: "email",
          provider: "sendgrid",
          is_read: true,
          has_attachments: false,
          metadata: {
            opens_count: email.opens_count,
            clicks_count: email.clicks_count,
            sendgrid_msg_id: email.msg_id,
          },
        };

        const { error: insertError } = await supabase
          .from("email_messages")
          .insert(emailData);

        if (insertError) {
          console.error(`Error inserting email ${email.msg_id}:`, insertError);
          errors++;
        } else {
          inserted++;
        }
      } catch (error) {
        console.error(`Error processing email ${email.msg_id}:`, error);
        errors++;
      }
    }

    const { error: updateError } = await supabase
      .from("email_accounts")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("email", "team@taxiassur.com");

    if (updateError) {
      console.error("Error updating last_sync_at:", updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "SendGrid emails synced successfully",
        stats: {
          total_retrieved: sendGridEmails.length,
          inserted,
          skipped,
          errors,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in sync-sendgrid-emails:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

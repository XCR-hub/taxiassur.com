import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface NotificationQueueItem {
  id: string;
  lead_id: string;
  channel: string;
  recipient_type: string;
  template_id: string;
  variables: Record<string, string>;
  priority: string;
  scheduled_at: string;
  status: string;
}

interface Template {
  template_id: string;
  name: string;
  channel: string;
  subject: string | null;
  content: string;
  html_content: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Processing notification queue...");

    const { data: pendingNotifications, error: fetchError } = await supabase
      .from("crm_notification_queue")
      .select(`
        *,
        crm_leads!inner(id, email, phone, first_name, last_name, full_name)
      `)
      .eq("status", "pending")
      .lte("scheduled_at", new Date().toISOString())
      .order("priority", { ascending: false })
      .order("scheduled_at", { ascending: true })
      .limit(50);

    if (fetchError) {
      throw fetchError;
    }

    if (!pendingNotifications || pendingNotifications.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: "No pending notifications" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${pendingNotifications.length} pending notifications`);

    const results = {
      processed: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      details: [] as { id: string; channel: string; status: string; error?: string }[]
    };

    for (const notification of pendingNotifications) {
      try {
        await supabase
          .from("crm_notification_queue")
          .update({ status: "processing", processed_at: new Date().toISOString() })
          .eq("id", notification.id);

        const { data: template } = await supabase
          .from("crm_notification_templates")
          .select("*")
          .eq("template_id", notification.template_id)
          .single();

        if (!template) {
          await markAsFailed(supabase, notification.id, "Template not found");
          results.failed++;
          results.details.push({ id: notification.id, channel: notification.channel, status: "failed", error: "Template not found" });
          continue;
        }

        const lead = notification.crm_leads;
        const variables = {
          ...notification.variables,
          first_name: lead?.first_name || lead?.full_name?.split(" ")[0] || "Client",
          last_name: lead?.last_name || "",
          email: lead?.email || "",
          phone: lead?.phone || ""
        };

        const content = replaceVariables(template.content, variables);
        const subject = template.subject ? replaceVariables(template.subject, variables) : null;

        let sendResult: { success: boolean; error?: string };

        switch (notification.channel) {
          case "email":
            sendResult = await sendEmail(supabase, supabaseUrl, supabaseKey, {
              to: notification.recipient_type === "team" ? "contact@taxiassur.com" : lead?.email,
              subject: subject || "TaxiAssur - Notification",
              content,
              html: template.html_content ? replaceVariables(template.html_content, variables) : undefined
            });
            break;

          case "sms":
            sendResult = await sendSMS(supabaseUrl, supabaseKey, {
              to: notification.recipient_type === "team" ? "+33176390060" : lead?.phone,
              body: content
            });
            break;

          case "whatsapp":
            sendResult = await sendWhatsApp(supabaseUrl, supabaseKey, {
              to: notification.recipient_type === "team" ? "+33176390060" : lead?.phone,
              message: content
            });
            break;

          default:
            sendResult = { success: false, error: `Unknown channel: ${notification.channel}` };
        }

        if (sendResult.success) {
          await supabase
            .from("crm_notification_queue")
            .update({ 
              status: "sent", 
              sent_at: new Date().toISOString(),
              error_message: null 
            })
            .eq("id", notification.id);
          results.sent++;
          results.details.push({ id: notification.id, channel: notification.channel, status: "sent" });
        } else {
          await markAsFailed(supabase, notification.id, sendResult.error || "Send failed");
          results.failed++;
          results.details.push({ id: notification.id, channel: notification.channel, status: "failed", error: sendResult.error });
        }

        results.processed++;
      } catch (err) {
        console.error(`Error processing notification ${notification.id}:`, err);
        await markAsFailed(supabase, notification.id, err instanceof Error ? err.message : "Unknown error");
        results.failed++;
        results.processed++;
      }
    }

    console.log(`Processed: ${results.processed}, Sent: ${results.sent}, Failed: ${results.failed}`);

    return new Response(
      JSON.stringify({ success: true, ...results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Notification queue processor error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function replaceVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, "g"), value || "");
  }
  return result;
}

async function markAsFailed(supabase: any, id: string, errorMessage: string) {
  await supabase
    .from("crm_notification_queue")
    .update({ 
      status: "failed", 
      error_message: errorMessage,
      processed_at: new Date().toISOString()
    })
    .eq("id", id);
}

async function sendEmail(
  supabase: any,
  supabaseUrl: string,
  supabaseKey: string,
  params: { to: string; subject: string; content: string; html?: string }
): Promise<{ success: boolean; error?: string }> {
  if (!params.to) {
    return { success: false, error: "No email address" };
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-email-ionos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({
        to: params.to,
        subject: params.subject,
        text: params.content,
        html: params.html
      })
    });

    const result = await response.json();
    return { success: result.success || response.ok, error: result.error };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Email send error" };
  }
}

async function sendSMS(
  supabaseUrl: string,
  supabaseKey: string,
  params: { to: string; body: string }
): Promise<{ success: boolean; error?: string }> {
  if (!params.to) {
    return { success: false, error: "No phone number" };
  }

  const formattedPhone = formatPhoneNumber(params.to);
  if (!formattedPhone) {
    return { success: false, error: "Invalid phone number format" };
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({
        to: formattedPhone,
        body: params.body
      })
    });

    const result = await response.json();
    return { success: result.success || response.ok, error: result.error };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "SMS send error" };
  }
}

async function sendWhatsApp(
  supabaseUrl: string,
  supabaseKey: string,
  params: { to: string; message: string }
): Promise<{ success: boolean; error?: string }> {
  if (!params.to) {
    return { success: false, error: "No phone number" };
  }

  const formattedPhone = formatPhoneNumber(params.to);
  if (!formattedPhone) {
    return { success: false, error: "Invalid phone number format" };
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({
        to: formattedPhone,
        message: params.message
      })
    });

    const result = await response.json();
    return { success: result.success || response.ok, error: result.error };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "WhatsApp send error" };
  }
}

function formatPhoneNumber(phone: string): string | null {
  if (!phone) return null;
  
  let cleaned = phone.replace(/[^0-9+]/g, "");
  
  if (cleaned.startsWith("0") && cleaned.length === 10) {
    cleaned = "+33" + cleaned.substring(1);
  }
  
  if (!cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
  }
  
  if (cleaned.length < 10) {
    return null;
  }
  
  return cleaned;
}
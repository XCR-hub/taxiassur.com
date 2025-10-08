import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailRequest {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: {
    email: string;
    name: string;
  };
  replyTo?: string;
  templateId?: string;
  dynamicTemplateData?: Record<string, any>;
  attachments?: Array<{
    filename: string;
    content: string;
    type?: string;
    disposition?: string;
  }>;
}

interface SendGridResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");

    if (!SENDGRID_API_KEY) {
      throw new Error("SENDGRID_API_KEY not configured");
    }

    const emailRequest: EmailRequest = await req.json();

    // Validation
    if (!emailRequest.to || !emailRequest.subject) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: to, subject",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!emailRequest.text && !emailRequest.html && !emailRequest.templateId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Must provide text, html, or templateId",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Build SendGrid request
    const sendGridPayload: any = {
      personalizations: [
        {
          to: [{ email: emailRequest.to }],
          subject: emailRequest.subject,
        },
      ],
      from: {
        email: emailRequest.from?.email || "contact@em5892.taxiassur.com",
        name: emailRequest.from?.name || "TaxiAssur.com",
      },
      reply_to: {
        email: emailRequest.replyTo || "team@taxiassur.com",
      },
      tracking_settings: {
        click_tracking: { enable: true },
        open_tracking: { enable: true },
      },
      mail_settings: {
        bypass_list_management: { enable: false },
        footer: { enable: false },
        sandbox_mode: { enable: false },
      },
    };

    // Add template or content
    if (emailRequest.templateId) {
      sendGridPayload.template_id = emailRequest.templateId;
      if (emailRequest.dynamicTemplateData) {
        sendGridPayload.personalizations[0].dynamic_template_data =
          emailRequest.dynamicTemplateData;
      }
    } else {
      sendGridPayload.content = [];

      if (emailRequest.text) {
        sendGridPayload.content.push({
          type: "text/plain",
          value: emailRequest.text,
        });
      }

      if (emailRequest.html) {
        sendGridPayload.content.push({
          type: "text/html",
          value: emailRequest.html,
        });
      }
    }

    // Add attachments if provided
    if (emailRequest.attachments && emailRequest.attachments.length > 0) {
      sendGridPayload.attachments = emailRequest.attachments.map((att) => ({
        filename: att.filename,
        content: att.content,
        type: att.type || "application/pdf",
        disposition: att.disposition || "attachment",
      }));
    }

    // Send via SendGrid API
    const sendGridResponse = await fetch(
      "https://api.sendgrid.com/v3/mail/send",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SENDGRID_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sendGridPayload),
      }
    );

    if (!sendGridResponse.ok) {
      const errorText = await sendGridResponse.text();
      console.error("SendGrid error:", errorText);

      return new Response(
        JSON.stringify({
          success: false,
          error: `SendGrid API error: ${sendGridResponse.status}`,
          details: errorText,
        }),
        {
          status: sendGridResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get message ID from response headers
    const messageId = sendGridResponse.headers.get("x-message-id") || undefined;

    const result: SendGridResponse = {
      success: true,
      messageId,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Email service error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
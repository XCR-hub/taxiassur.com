import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailRequest {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { to, subject, text, html } = await req.json() as EmailRequest;

    if (!to || !subject || !text) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: to, subject, text"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
    const BREVO_SENDER_EMAIL = Deno.env.get("BREVO_SENDER_EMAIL") || "team@taxiassur.com";
    const BREVO_SENDER_NAME = Deno.env.get("BREVO_SENDER_NAME") || "TaxiAssur";

    if (!BREVO_API_KEY) {
      console.error("BREVO_API_KEY not configured");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Email service not configured"
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const brevoPayload = {
      sender: {
        name: BREVO_SENDER_NAME,
        email: BREVO_SENDER_EMAIL
      },
      to: [{ email: to }],
      subject: subject,
      ...(html ? { htmlContent: html } : { textContent: text })
    };

    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "api-key": BREVO_API_KEY
      },
      body: JSON.stringify(brevoPayload)
    });

    if (!brevoResponse.ok) {
      const errorText = await brevoResponse.text();
      console.error("Brevo API error:", errorText);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Email service error: ${brevoResponse.status}`,
          details: errorText
        }),
        {
          status: brevoResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const result = await brevoResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        messageId: result.messageId,
        message: "Email sent successfully via Brevo"
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Send email error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SMSRequest {
  sms_id: string;
  phone: string;
  message: string;
  type: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { sms_id, phone, message, type }: SMSRequest = await req.json();

    // Provider SMS (Twilio, OVH, Sendinblue...)
    const SMS_PROVIDER = Deno.env.get("SMS_PROVIDER") || "twilio";

    let result;

    if (SMS_PROVIDER === "twilio") {
      result = await sendViaTwilio(phone, message);
    } else if (SMS_PROVIDER === "ovh") {
      result = await sendViaOVH(phone, message);
    } else if (SMS_PROVIDER === "sendinblue") {
      result = await sendViaSendinblue(phone, message);
    } else {
      throw new Error(`Provider SMS non supporté: ${SMS_PROVIDER}`);
    }

    // Mise à jour statut SMS dans la base
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    await fetch(`${supabaseUrl}/rest/v1/sms_logs?id=eq.${sms_id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseKey}`,
        apikey: supabaseKey,
      },
      body: JSON.stringify({
        status: result.success ? "sent" : "failed",
        provider_message_id: result.messageId,
        error_message: result.error,
        cost_euros: result.cost || 0.05, // ~5 centimes par SMS
        sent_at: result.success ? new Date().toISOString() : null,
      }),
    });

    return new Response(
      JSON.stringify({
        success: result.success,
        sms_id,
        message_id: result.messageId,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Erreur envoi SMS:", error);

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

// ============================================================================
// TWILIO (Recommandé - Fiable et international)
// ============================================================================

async function sendViaTwilio(
  phone: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string; cost?: number }> {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const fromNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

  if (!accountSid || !authToken || !fromNumber) {
    return {
      success: false,
      error: "Configuration Twilio manquante",
    };
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " + btoa(`${accountSid}:${authToken}`),
      },
      body: new URLSearchParams({
        To: phone,
        From: fromNumber,
        Body: message,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        error: `Twilio error: ${error}`,
      };
    }

    const data = await response.json();

    return {
      success: true,
      messageId: data.sid,
      cost: parseFloat(data.price || "0.05"),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

// ============================================================================
// OVH (Français - Moins cher)
// ============================================================================

async function sendViaOVH(
  phone: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string; cost?: number }> {
  const applicationKey = Deno.env.get("OVH_APPLICATION_KEY");
  const applicationSecret = Deno.env.get("OVH_APPLICATION_SECRET");
  const consumerKey = Deno.env.get("OVH_CONSUMER_KEY");
  const serviceName = Deno.env.get("OVH_SMS_SERVICE_NAME");

  if (!applicationKey || !applicationSecret || !consumerKey || !serviceName) {
    return {
      success: false,
      error: "Configuration OVH manquante",
    };
  }

  try {
    // Note: OVH nécessite signature complexe, version simplifiée ici
    const url = `https://eu.api.ovh.com/1.0/sms/${serviceName}/jobs`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Ovh-Application": applicationKey,
        "X-Ovh-Consumer": consumerKey,
      },
      body: JSON.stringify({
        message,
        receivers: [phone],
        sender: "TaxiAssur",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        error: `OVH error: ${error}`,
      };
    }

    const data = await response.json();

    return {
      success: true,
      messageId: data.ids?.[0],
      cost: 0.04, // ~4 centimes
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

// ============================================================================
// SENDINBLUE / BREVO (Français - Facile)
// ============================================================================

async function sendViaSendinblue(
  phone: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string; cost?: number }> {
  const apiKey = Deno.env.get("SENDINBLUE_API_KEY");

  if (!apiKey) {
    return {
      success: false,
      error: "Configuration Sendinblue manquante",
    };
  }

  try {
    const url = "https://api.sendinblue.com/v3/transactionalSMS/sms";

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        type: "transactional",
        recipient: phone,
        content: message,
        sender: "TaxiAssur",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        error: `Sendinblue error: ${error}`,
      };
    }

    const data = await response.json();

    return {
      success: true,
      messageId: data.reference,
      cost: 0.045, // ~4.5 centimes
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

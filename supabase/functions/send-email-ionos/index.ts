import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function sendEmailSMTP(
  to: string,
  toName: string,
  subject: string,
  htmlBody: string,
  fromEmail: string = "team@taxiassur.com",
  fromName: string = "TaxiAssur"
): Promise<void> {
  const SMTP_HOST = Deno.env.get("IONOS_SMTP_HOST") || "smtp.ionos.fr";
  const SMTP_PORT = parseInt(Deno.env.get("IONOS_SMTP_PORT") || "465");
  const SMTP_USER = Deno.env.get("IONOS_EMAIL_USER") || "team@taxiassur.com";
  const SMTP_PASS = Deno.env.get("IONOS_EMAIL_PASSWORD");

  console.log(`📧 [IONOS] Configuration SMTP: ${SMTP_HOST}:${SMTP_PORT} user=${SMTP_USER}`);

  if (!SMTP_PASS) {
    throw new Error("❌ IONOS_EMAIL_PASSWORD not configured in secrets");
  }

  // Port 465 = SSL/TLS direct (pas STARTTLS)
  const conn = await Deno.connectTls({
    hostname: SMTP_HOST,
    port: SMTP_PORT,
  });

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  async function readResponse(): Promise<string> {
    const buffer = new Uint8Array(4096);
    const n = await conn.read(buffer);
    if (n === null) return "";
    const response = decoder.decode(buffer.subarray(0, n));
    console.log(`📨 [SMTP] Recu: ${response.trim()}`);
    return response;
  }

  async function sendCommand(command: string): Promise<string> {
    console.log(`📤 [SMTP] Envoi: ${command}`);
    await conn.write(encoder.encode(command + "\r\n"));
    return await readResponse();
  }

  try {
    // Lire le banner
    const banner = await readResponse();
    console.log(`✅ [SMTP] Connecté: ${banner.trim()}`);

    // EHLO
    await sendCommand(`EHLO taxiassur.com`);

    // Authentification
    await sendCommand("AUTH LOGIN");
    await sendCommand(btoa(SMTP_USER));
    const authResponse = await sendCommand(btoa(SMTP_PASS));

    if (authResponse.includes("535")) {
      throw new Error("❌ Authentification SMTP échouée - vérifier les identifiants");
    }

    console.log(`✅ [SMTP] Authentifié avec succès`);

    // Envoi de l'email
    await sendCommand(`MAIL FROM:<${fromEmail}>`);
    await sendCommand(`RCPT TO:<${to}>`);
    await sendCommand("DATA");

    const emailContent = [
      `From: ${fromName} <${fromEmail}>`,
      `To: ${toName} <${to}>`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: 8bit`,
      ``,
      htmlBody,
      `.`,
    ].join("\r\n");

    await sendCommand(emailContent);
    await sendCommand("QUIT");

    console.log(`✅ [SMTP] Email envoyé avec succès à ${to}`);
    conn.close();
  } catch (error) {
    console.error(`❌ [SMTP] Erreur:`, error);
    conn.close();
    throw error;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const payload: any = await req.json();

    console.log(`📧 [HANDLER] Requête reçue:`, JSON.stringify(payload).substring(0, 200));

    // Format direct pour envoi simple
    if (payload.to && payload.subject && (payload.html || payload.htmlBody)) {
      console.log(`📧 [HANDLER] Format direct détecté - envoi à ${payload.to}`);

      await sendEmailSMTP(
        payload.to,
        payload.toName || payload.to,
        payload.subject,
        payload.html || payload.htmlBody,
        payload.from || payload.fromEmail || "team@taxiassur.com",
        payload.fromName || "TaxiAssur"
      );

      return new Response(
        JSON.stringify({
          success: true,
          message: "Email envoyé via IONOS SMTP",
          recipient: payload.to
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Si pas de format reconnu
    throw new Error("Format invalide: les champs 'to', 'subject' et 'html' sont requis");

  } catch (error) {
    console.error("❌ [HANDLER] Erreur:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: error.toString()
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
